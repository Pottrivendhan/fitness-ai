from datetime import datetime, timedelta
from typing import Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.utils import convert_object_id, DateTimeUtils, HealthCalculations

class AnalyticsService:
    """Analytics and reporting service"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.health_logs_collection = db.health_logs
        self.profiles_collection = db.profiles
        self.workouts_collection = db.workouts
        self.diet_plans_collection = db.diet_plans
        self.users_collection = db.users
        self.workout_plans_collection = db.workout_plans
    
    async def get_dashboard_data(self, user_id: str) -> Dict[str, Any]:
        """Get dashboard data for user"""
        today = DateTimeUtils.get_today_start()
        week_start = DateTimeUtils.get_week_start()
        
        # Get today's logs
        today_logs = await self.health_logs_collection.find_one({
            "user_id": ObjectId(user_id),
            "log_date": {"$gte": today}
        })
        
        # Get weekly logs
        weekly_logs = []
        async for log in self.health_logs_collection.find({
            "user_id": ObjectId(user_id),
            "log_date": {"$gte": week_start}
        }):
            weekly_logs.append(log)
        
        # Get profile and user info
        profile = await self.profiles_collection.find_one({"user_id": ObjectId(user_id)})
        user = await self.users_collection.find_one({"_id": ObjectId(user_id)})
        avatar_url = user.get("avatar_url") if user else None
        
        # Get latest BMI log
        latest_bmi_log = await self.db.bmi_history.find_one(
            {"user_id": ObjectId(user_id)},
            sort=[("created_at", -1)]
        )
        
        bmi = 0.0
        bmi_category = "Normal"
        if latest_bmi_log:
            bmi = latest_bmi_log.get("bmi", 0.0)
            bmi_category = latest_bmi_log.get("category", "Normal")
        elif profile:
            height_m = profile.get("height", 0) / 100
            weight = profile.get("weight", 0)
            if height_m > 0 and weight > 0:
                bmi_calc = HealthCalculations.calculate_bmi(weight, profile.get("height", 0))
                bmi = bmi_calc.get("bmi", 0.0)
                bmi_category = bmi_calc.get("category", "Normal")
            
        # Get latest Calorie log
        latest_calorie_log = await self.db.calorie_history.find_one(
            {"user_id": ObjectId(user_id)},
            sort=[("created_at", -1)]
        )
        
        recommended_calories = 2000
        if latest_calorie_log:
            db_goal = "maintain"
            if profile:
                db_goal = profile.get("goal") or profile.get("fitness_goal", "maintain")
            
            if db_goal in ["weight_loss", "Weight Loss"]:
                recommended_calories = latest_calorie_log.get("weight_loss_calories", 2000)
            elif db_goal in ["weight_gain", "muscle_building", "Weight Gain", "Muscle Gain"]:
                recommended_calories = latest_calorie_log.get("weight_gain_calories", 2000)
            else:
                recommended_calories = latest_calorie_log.get("maintenance_calories", 2000)
        elif profile:
            recommended_calories = profile.get("daily_calorie_goal", 2000)
            
        # Format goal and activity level display strings
        GOAL_MAP = {
            "weight_loss": "Weight Loss",
            "weight_gain": "Weight Gain",
            "muscle_building": "Muscle Gain",
            "maintain": "Maintain",
            "improve_endurance": "Maintain",
            "general_fitness": "Maintain"
        }
        ACTIVITY_MAP = {
            "sedentary": "Sedentary",
            "lightly_active": "Light",
            "moderately_active": "Moderate",
            "very_active": "Active",
            "extremely_active": "Active"
        }
        
        goal_val = None
        activity_val = None
        if profile:
            db_goal = profile.get("goal") or profile.get("fitness_goal", "maintain")
            goal_val = GOAL_MAP.get(db_goal, db_goal)
            
            db_act = profile.get("activity_level", "sedentary")
            activity_val = ACTIVITY_MAP.get(db_act, db_act)
        
        # Calculate weekly averages
        week_steps = [log.get("steps", 0) for log in weekly_logs if log.get("steps")]
        week_calories = [log.get("calories_consumed", 0) for log in weekly_logs if log.get("calories_consumed")]
        week_exercise = [log.get("exercise_duration", 0) for log in weekly_logs if log.get("exercise_duration")]
        
        # Get today's workout plan statistics
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        today_workout = await self.workout_plans_collection.find_one({
            "user_id": ObjectId(user_id),
            "date": today_str
        })
        
        workout_summary = {
            "name": "Rest Day Recovery" if not today_workout else today_workout.get("name"),
            "difficulty": "beginner" if not today_workout else today_workout.get("difficulty"),
            "is_completed": False if not today_workout else today_workout.get("is_completed"),
            "completion_percentage": 0.0,
            "calories_burned": 0
        }
        
        if today_workout:
            exercises = today_workout.get("exercises", [])
            completed_exs = [ex for ex in exercises if ex.get("is_completed", False)]
            if len(exercises) > 0:
                workout_summary["completion_percentage"] = round((len(completed_exs) / len(exercises)) * 100, 1)
            workout_summary["calories_burned"] = sum(ex.get("calories_burned", 0) for ex in completed_exs)
            if today_workout.get("is_completed", False):
                workout_summary["completion_percentage"] = 100.0
                workout_summary["calories_burned"] = today_workout.get("calories_burned", 0)
                
        # Get today's diet plan details
        today_diet = await self.db.diet_plans.find_one({
            "user_id": ObjectId(user_id),
            "date": today_str
        })
        
        diet_summary = {
            "completed_meals": 0,
            "total_meals": 5,
            "calories_consumed": 0,
            "calories_target": 2000,
            "completion_percentage": 0.0
        }
        
        if today_diet:
            meals = today_diet.get("meals", {})
            completed = [m for m in meals.values() if m.get("is_completed", False)]
            diet_summary["completed_meals"] = len(completed)
            diet_summary["total_meals"] = len(meals)
            diet_summary["calories_consumed"] = sum(m.get("calories", 0) for m in completed)
            diet_summary["calories_target"] = today_diet.get("calories_target", 2000)
            if len(meals) > 0:
                diet_summary["completion_percentage"] = round((len(completed) / len(meals)) * 100, 1)

        # Streak calculation
        streak = await self.get_streak_count(user_id)
        
        # Calculate goal completions status
        step_goal = profile.get("daily_step_goal", 10000) if profile else 10000
        water_goal = profile.get("daily_water_goal", 2000) if profile else 2000
        calorie_goal = recommended_calories
        sleep_goal = profile.get("sleep_goal", 8) if profile else 8
        
        today_steps = today_logs.get("steps", 0) if today_logs else 0
        today_water = today_logs.get("water_intake", 0) if today_logs else 0
        today_cals = today_logs.get("calories_consumed", 0) if today_logs else 0
        today_sleep = today_logs.get("sleep_hours", 0) if today_logs else 0
        
        goal_completions = {
            "steps": {
                "current": today_steps,
                "target": step_goal,
                "percentage": min(100.0, round((today_steps / step_goal) * 100, 1) if step_goal > 0 else 0)
            },
            "water": {
                "current": today_water,
                "target": water_goal,
                "percentage": min(100.0, round((today_water / water_goal) * 100, 1) if water_goal > 0 else 0)
            },
            "calories": {
                "current": today_cals,
                "target": calorie_goal,
                "percentage": min(100.0, round((today_cals / calorie_goal) * 100, 1) if calorie_goal > 0 else 0)
            },
            "sleep": {
                "current": today_sleep,
                "target": sleep_goal,
                "percentage": min(100.0, round((today_sleep / sleep_goal) * 100, 1) if sleep_goal > 0 else 0)
            }
        }
        
        # Badges (computed dynamically based on logs)
        badges = [
            {
                "id": "hydration_hero",
                "title": "Hydration Hero",
                "description": "Log at least 2,000 ml of water in a single day",
                "icon": "FaTint",
                "unlocked": any(log.get("water_intake", 0) >= 2000 for log in weekly_logs) or today_water >= 2000
            },
            {
                "id": "step_master",
                "title": "Step Master",
                "description": "Walk 10,000 steps or more in a single day",
                "icon": "FaWalking",
                "unlocked": any(log.get("steps", 0) >= 10000 for log in weekly_logs) or today_steps >= 10000
            },
            {
                "id": "early_bird",
                "title": "Early Bird",
                "description": "Log at least 8 hours of sleep in a single day",
                "icon": "FaMoon",
                "unlocked": any(log.get("sleep_hours", 0) >= 8 for log in weekly_logs) or today_sleep >= 8
            },
            {
                "id": "consistency_king",
                "title": "Consistency King",
                "description": "Achieve a tracking streak of 3 days or more",
                "icon": "FaFire",
                "unlocked": streak >= 3
            },
            {
                "id": "workout_warrior",
                "title": "Workout Warrior",
                "description": "Complete today's scheduled workout",
                "icon": "FaDumbbell",
                "unlocked": workout_summary["is_completed"] or workout_summary["completion_percentage"] >= 100.0
            },
            {
                "id": "diet_disciple",
                "title": "Diet Disciple",
                "description": "Complete all meals in today's diet plan",
                "icon": "FaUtensils",
                "unlocked": diet_summary["total_meals"] > 0 and diet_summary["completed_meals"] == diet_summary["total_meals"]
            }
        ]
        
        return {
            "today": {
                "steps": today_steps,
                "water": today_water,
                "calories": today_cals,
                "exercise_minutes": today_logs.get("exercise_duration", 0) if today_logs else 0,
                "sleep_hours": today_sleep,
                "mood": today_logs.get("mood") if today_logs else None
            },
            "weekly": {
                "average_steps": round(sum(week_steps) / len(week_steps)) if week_steps else 0,
                "average_calories": round(sum(week_calories) / len(week_calories)) if week_calories else 0,
                "total_exercise_minutes": sum(week_exercise) if week_exercise else 0,
                "days_logged": len(weekly_logs)
            },
            "profile": {
                "current_weight": profile.get("weight") if profile else 0,
                "target_weight": profile.get("target_weight") if profile else None,
                "bmi": bmi,
                "bmi_category": bmi_category,
                "recommended_calories": recommended_calories,
                "fitness_goal": goal_val,
                "activity_level": activity_val,
                "avatar_url": avatar_url
            },
            "workout": workout_summary,
            "diet": diet_summary,
            "streak_days": streak,
            "goal_completions": goal_completions,
            "badges": badges
        }
    
    async def get_report(self, user_id: str, period: str = "weekly") -> Dict[str, Any]:
        """Generate report for specified period"""
        now = datetime.utcnow()
        
        if period == "weekly":
            start_date = now - timedelta(days=7)
            period_label = "Weekly"
        elif period == "monthly":
            start_date = now - timedelta(days=30)
            period_label = "Monthly"
        elif period == "yearly":
            start_date = now - timedelta(days=365)
            period_label = "Yearly"
        else:
            start_date = now - timedelta(days=7)
            period_label = "Weekly"
        
        # Get logs for period
        logs = []
        async for log in self.health_logs_collection.find({
            "user_id": ObjectId(user_id),
            "log_date": {"$gte": start_date}
        }).sort("log_date", -1):
            logs.append(log)
        
        # Calculate metrics
        steps_data = [log.get("steps", 0) for log in logs if log.get("steps")]
        calories_data = [log.get("calories_consumed", 0) for log in logs if log.get("calories_consumed")]
        water_data = [log.get("water_intake", 0) for log in logs if log.get("water_intake")]
        exercise_data = [log.get("exercise_duration", 0) for log in logs if log.get("exercise_duration")]
        sleep_data = [log.get("sleep_hours", 0) for log in logs if log.get("sleep_hours")]
        weight_data = [log.get("weight", 0) for log in logs if log.get("weight")]
        
        # Get start and end weight for change
        weight_change = 0.0
        if weight_data:
            weight_change = round(weight_data[0] - weight_data[-1], 1) if len(weight_data) > 1 else 0.0
            
        # Get workouts completed in this period
        start_date_str = start_date.strftime("%Y-%m-%d")
        now_str = now.strftime("%Y-%m-%d")
        
        workout_plans = []
        async for w in self.workout_plans_collection.find({
            "user_id": ObjectId(user_id),
            "date": {"$gte": start_date_str, "$lte": now_str}
        }):
            workout_plans.append(w)
            
        completed_workouts = [w for w in workout_plans if w.get("is_completed", False)]
        workout_adherence = 0.0
        if workout_plans:
            workout_adherence = round((len(completed_workouts) / len(workout_plans)) * 100, 1)
            
        # Get diets completed in this period
        diet_plans = []
        async for d in self.diet_plans_collection.find({
            "user_id": ObjectId(user_id),
            "date": {"$gte": start_date_str, "$lte": now_str}
        }):
            diet_plans.append(d)
            
        completed_meals = 0
        total_meals = 0
        for d in diet_plans:
            meals = d.get("meals", {})
            completed_meals += sum(1 for m in meals.values() if m.get("is_completed", False))
            total_meals += len(meals)
            
        diet_adherence = 0.0
        if total_meals > 0:
            diet_adherence = round((completed_meals / total_meals) * 100, 1)
            
        # Calculate BMI starting and ending
        profile = await self.profiles_collection.find_one({"user_id": ObjectId(user_id)})
        height = profile.get("height", 175) if profile else 175
        
        bmi_start = 0.0
        bmi_end = 0.0
        if weight_data:
            bmi_start = round(weight_data[-1] / ((height/100)**2), 1) if height > 0 else 0.0
            bmi_end = round(weight_data[0] / ((height/100)**2), 1) if height > 0 else 0.0
            
        bmi_trend = "Stable"
        if bmi_end < bmi_start - 0.2:
            bmi_trend = "Decreasing"
        elif bmi_end > bmi_start + 0.2:
            bmi_trend = "Increasing"
        
        return {
            "period": period_label,
            "start_date": start_date.isoformat(),
            "end_date": now.isoformat(),
            "metrics": {
                "total_steps": sum(steps_data),
                "average_daily_steps": round(sum(steps_data) / len(steps_data)) if steps_data else 0,
                "total_water_ml": sum(water_data),
                "average_daily_water_ml": round(sum(water_data) / len(water_data)) if water_data else 0,
                "total_exercise_minutes": sum(exercise_data),
                "average_daily_calories": round(sum(calories_data) / len(calories_data)) if calories_data else 0,
                "average_sleep_hours": round(sum(sleep_data) / len(sleep_data), 1) if sleep_data else 0,
                "weight_change_kg": weight_change,
                "workout_adherence_percent": workout_adherence,
                "diet_adherence_percent": diet_adherence,
                "bmi_start": bmi_start,
                "bmi_end": bmi_end,
                "bmi_trend": bmi_trend
            },
            "logs_count": len(logs)
        }
    
    async def get_chart_data(self, user_id: str, chart_type: str, days: int = 30) -> List[Dict[str, Any]]:
        """Get data for charts with fallback handling for date gaps"""
        start_date = datetime.utcnow() - timedelta(days=days)
        start_date_str = start_date.strftime("%Y-%m-%d")
        now_str = datetime.utcnow().strftime("%Y-%m-%d")
        
        # Get logs in period
        logs = []
        async for log in self.health_logs_collection.find({
            "user_id": ObjectId(user_id),
            "log_date": {"$gte": start_date}
        }).sort("log_date", 1):
            logs.append(log)
            
        # Get profile height for BMI calculations
        profile = await self.profiles_collection.find_one({"user_id": ObjectId(user_id)})
        height = profile.get("height", 175.0) if profile else 175.0
        
        # Prepopulate date map to fill in missing days safely
        chart_data_map = {}
        for i in range(days + 1):
            d = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
            chart_data_map[d] = None
            
        if chart_type == "steps":
            for log in logs:
                d_str = log["log_date"].strftime("%Y-%m-%d")
                chart_data_map[d_str] = log.get("steps", 0)
            return [{"date": d, "value": v if v is not None else 0, "label": "Steps"} for d, v in chart_data_map.items()]
            
        elif chart_type == "weight":
            # For weight, propagate the last logged weight forward so there are no gaps
            last_weight = profile.get("weight", 0.0) if profile else 0.0
            
            # Find any weight logs before the start_date to initialize
            prev_log = await self.health_logs_collection.find_one(
                {"user_id": ObjectId(user_id), "log_date": {"$lt": start_date}, "weight": {"$ne": None}},
                sort=[("log_date", -1)]
            )
            if prev_log and prev_log.get("weight"):
                last_weight = prev_log["weight"]
                
            for i in range(days + 1):
                d_date = start_date + timedelta(days=i)
                d_str = d_date.strftime("%Y-%m-%d")
                
                # Check if we have a log on this day with weight
                day_log = next((l for l in logs if l["log_date"].strftime("%Y-%m-%d") == d_str and l.get("weight")), None)
                if day_log and day_log.get("weight"):
                    last_weight = day_log["weight"]
                    
                chart_data_map[d_str] = last_weight
            return [{"date": d, "value": v, "label": "Weight (kg)"} for d, v in chart_data_map.items()]
            
        elif chart_type == "bmi":
            # BMI relies on weight and height
            last_weight = profile.get("weight", 0.0) if profile else 0.0
            prev_log = await self.health_logs_collection.find_one(
                {"user_id": ObjectId(user_id), "log_date": {"$lt": start_date}, "weight": {"$ne": None}},
                sort=[("log_date", -1)]
            )
            if prev_log and prev_log.get("weight"):
                last_weight = prev_log["weight"]
                
            for i in range(days + 1):
                d_date = start_date + timedelta(days=i)
                d_str = d_date.strftime("%Y-%m-%d")
                day_log = next((l for l in logs if l["log_date"].strftime("%Y-%m-%d") == d_str and l.get("weight")), None)
                if day_log and day_log.get("weight"):
                    last_weight = day_log["weight"]
                
                bmi_val = round(last_weight / ((height / 100) ** 2), 1) if height > 0 and last_weight > 0 else 0.0
                chart_data_map[d_str] = bmi_val
            return [{"date": d, "value": v, "label": "BMI"} for d, v in chart_data_map.items()]
            
        elif chart_type == "calories":
            for log in logs:
                d_str = log["log_date"].strftime("%Y-%m-%d")
                chart_data_map[d_str] = log.get("calories_consumed", 0)
            return [{"date": d, "value": v if v is not None else 0, "label": "Calories"} for d, v in chart_data_map.items()]
            
        elif chart_type == "water":
            for log in logs:
                d_str = log["log_date"].strftime("%Y-%m-%d")
                chart_data_map[d_str] = log.get("water_intake", 0)
            return [{"date": d, "value": v if v is not None else 0, "label": "Water (ml)"} for d, v in chart_data_map.items()]
            
        elif chart_type == "sleep":
            for log in logs:
                d_str = log["log_date"].strftime("%Y-%m-%d")
                chart_data_map[d_str] = log.get("sleep_hours", 0)
            return [{"date": d, "value": v if v is not None else 0.0, "label": "Sleep (hours)"} for d, v in chart_data_map.items()]
            
        elif chart_type == "exercise":
            for log in logs:
                d_str = log["log_date"].strftime("%Y-%m-%d")
                chart_data_map[d_str] = log.get("exercise_duration", 0)
            return [{"date": d, "value": v if v is not None else 0, "label": "Exercise (minutes)"} for d, v in chart_data_map.items()]
            
        elif chart_type == "workout_completion":
            # Find workout plans in the period
            w_plans = {}
            async for plan in self.workout_plans_collection.find({
                "user_id": ObjectId(user_id),
                "date": {"$gte": start_date_str, "$lte": now_str}
            }):
                w_plans[plan["date"]] = plan
                
            for i in range(days + 1):
                d_str = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
                plan = w_plans.get(d_str)
                if plan:
                    if plan.get("is_completed", False):
                        pct = 100.0
                    else:
                        exercises = plan.get("exercises", [])
                        comp = sum(1 for e in exercises if e.get("is_completed", False))
                        pct = round((comp / len(exercises)) * 100, 1) if exercises else 0.0
                    chart_data_map[d_str] = pct
                else:
                    chart_data_map[d_str] = 0.0
            return [{"date": d, "value": v, "label": "Workout Completion (%)"} for d, v in chart_data_map.items()]
            
        elif chart_type == "diet_adherence":
            # Find diet plans in the period
            d_plans = {}
            async for plan in self.diet_plans_collection.find({
                "user_id": ObjectId(user_id),
                "date": {"$gte": start_date_str, "$lte": now_str}
            }):
                d_plans[plan["date"]] = plan
                
            for i in range(days + 1):
                d_str = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
                plan = d_plans.get(d_str)
                if plan:
                    meals = plan.get("meals", {})
                    completed = sum(1 for m in meals.values() if m.get("is_completed", False))
                    pct = round((completed / len(meals)) * 100, 1) if meals else 0.0
                    chart_data_map[d_str] = pct
                else:
                    chart_data_map[d_str] = 0.0
            return [{"date": d, "value": v, "label": "Diet Adherence (%)"} for d, v in chart_data_map.items()]
            
        return []
    
    async def get_ai_insights(self, user_id: str) -> List[Dict[str, Any]]:
        """Dynamically analyze user health logs and profile to generate rich AI insights"""
        # Fetch profile
        profile = await self.profiles_collection.find_one({"user_id": ObjectId(user_id)})
        
        # Fetch past 7 days of logs
        week_start = datetime.utcnow() - timedelta(days=7)
        logs = []
        async for log in self.health_logs_collection.find({
            "user_id": ObjectId(user_id),
            "log_date": {"$gte": week_start}
        }):
            logs.append(log)
            
        # Get goals with safe fallbacks
        step_goal = 10000
        water_goal = 2000
        sleep_goal = 8
        
        if profile:
            step_goal = profile.get("daily_step_goal") or 10000
            water_goal = profile.get("daily_water_goal") or profile.get("water_intake_goal") or 2000
            sleep_goal = profile.get("sleep_goal") or 8
            
        steps = [l.get("steps", 0) for l in logs if l.get("steps")]
        water = [l.get("water_intake", 0) for l in logs if l.get("water_intake")]
        sleep = [l.get("sleep_hours", 0) for l in logs if l.get("sleep_hours")]
        
        avg_steps = sum(steps) / len(steps) if steps else 0
        avg_water = sum(water) / len(water) if water else 0
        avg_sleep = sum(sleep) / len(sleep) if sleep else 0
        
        insights = []
        
        # 1. Steps Insight
        if avg_steps < step_goal:
            pct = round((avg_steps / step_goal) * 100) if step_goal > 0 else 0
            insights.append({
                "category": "steps",
                "type": "warning",
                "title": "Daily Steps Deficit",
                "message": f"Your steps averaged {round(avg_steps)} daily this week, which is only {pct}% of your {step_goal}-step target. Incremental walking increases daily calorie expenditure.",
                "action_plan": "Commit to a 10-minute brisk walk immediately following lunch and dinner. Take stairs instead of elevators whenever possible."
            })
        else:
            pct_ex = round(((avg_steps - step_goal) / step_goal) * 100) if step_goal > 0 else 0
            insights.append({
                "category": "steps",
                "type": "success",
                "title": "Active Movement Milestone",
                "message": f"Superb activity levels! You averaged {round(avg_steps)} daily steps this week, which is {pct_ex}% above your daily step goal of {step_goal}.",
                "action_plan": "Keep up the momentum. Try setting a new daily steps milestone or add short runs/jogs to challenge your cardiovascular system."
            })
            
        # 2. Water Insight
        if avg_water < water_goal:
            insights.append({
                "category": "water",
                "type": "warning",
                "title": "Hydration Needs Improvement",
                "message": f"You are averaging {round(avg_water)} ml of water daily. Proper hydration is essential for digestion, joints, and cellular repair.",
                "action_plan": f"Keep a 1-liter bottle at your desk and aim to drink at least two full bottles over the course of the day to reach your {water_goal} ml target."
            })
        else:
            insights.append({
                "category": "water",
                "type": "success",
                "title": "Hydration Goal Achieved",
                "message": f"Excellent hydration! You averaged {round(avg_water)} ml of water daily, keeping your muscles hydrated and supporting healthy metabolism.",
                "action_plan": "Maintain this intake. On heavy training days, add an extra 500 ml with electrolytes to support fluid balance."
            })
            
        # 3. Sleep Insight
        if avg_sleep < sleep_goal:
            insights.append({
                "category": "sleep",
                "type": "warning",
                "title": "Sleep and Recovery Deficit",
                "message": f"Your sleep averaged {round(avg_sleep, 1)} hours this week. Muscle recovery, tissue synthesis, and memory consolidation happen during deep sleep.",
                "action_plan": f"Aim for at least {sleep_goal} hours of sleep. Create a wind-down routine starting 30 minutes before bed: dim lights, read, or stretch."
            })
        else:
            insights.append({
                "category": "sleep",
                "type": "success",
                "title": "Rest and Recovery Status",
                "message": f"Good sleep habits! You averaged {round(avg_sleep, 1)} hours of sleep, giving your body adequate rest to recover and repair muscle tissues.",
                "action_plan": "Maintain a regular sleep schedule. Keep your bedroom quiet, dark, and cool to maximize sleep quality."
            })
            
        # 4. Workout Adherence Insight
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        week_start_str = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")
        workout_logs = []
        async for plan in self.workout_plans_collection.find({
            "user_id": ObjectId(user_id),
            "date": {"$gte": week_start_str, "$lte": today_str}
        }):
            workout_logs.append(plan)
            
        if workout_logs:
            completed_workouts = [w for w in workout_logs if w.get("is_completed", False)]
            completion_pct = (len(completed_workouts) / len(workout_logs)) * 100
            if completion_pct < 60:
                insights.append({
                    "category": "workout",
                    "type": "warning",
                    "title": "Consistency Check",
                    "message": f"You completed {round(completion_pct)}% of scheduled workouts ({len(completed_workouts)} of {len(workout_logs)}). Consistency is key to physical progression.",
                    "action_plan": "Schedule workouts at the same time each day. Treat them as non-negotiable appointments. If short on time, do a 15-minute express workout."
                })
            else:
                insights.append({
                    "category": "workout",
                    "type": "success",
                    "title": "Consistent Training Routine",
                    "message": f"Great consistency! You completed {round(completion_pct)}% of scheduled workouts ({len(completed_workouts)} of {len(workout_logs)}) this week.",
                    "action_plan": "Excellent dedication. Introduce progressive overload on your main exercises by slowly adding repetitions or resistance."
                })
        else:
            insights.append({
                "category": "workout",
                "type": "info",
                "title": "Establish Exercise Habit",
                "message": "We couldn't find any workout logs for this week. Establishing a regular physical routine is critical for physical fitness and stress relief.",
                "action_plan": "Go to the Workout tab to generate a custom fitness routine tailored specifically to your fitness goal."
            })
            
        return insights
        
    async def get_streak_count(self, user_id: str) -> int:
        """Get workout/tracking streak count"""
        today = DateTimeUtils.get_today_start()
        streak = 0
        
        for i in range(365):  # Check up to 1 year
            check_date = today - timedelta(days=i)
            log = await self.health_logs_collection.find_one({
                "user_id": ObjectId(user_id),
                "log_date": {
                    "$gte": check_date,
                    "$lt": check_date + timedelta(days=1)
                }
            })
            
            if log:
                streak += 1
            else:
                break
        
        return streak
    
    async def get_admin_analytics(self) -> Dict[str, Any]:
        """Get admin analytics"""
        total_users = await self.users_collection.count_documents({})
        
        # Count new users today
        today = DateTimeUtils.get_today_start()
        new_users_today = await self.users_collection.count_documents({
            "created_at": {"$gte": today}
        })
        
        # Count new users this week
        week_start = DateTimeUtils.get_week_start()
        new_users_week = await self.users_collection.count_documents({
            "created_at": {"$gte": week_start}
        })
        
        # Count active users (logged in this week)
        active_users = await self.users_collection.count_documents({
            "last_login": {"$gte": week_start}
        })
        
        # Count total workouts and diets
        total_workouts = await self.workouts_collection.count_documents({})
        total_diets = await self.diet_plans_collection.count_documents({})
        total_health_logs = await self.health_logs_collection.count_documents({})
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "new_users_today": new_users_today,
            "new_users_week": new_users_week,
            "total_workouts": total_workouts,
            "total_diets": total_diets,
            "total_health_logs": total_health_logs,
            "average_logs_per_user": round(total_health_logs / total_users) if total_users > 0 else 0
        }
