from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.schemas import BMICalculationSchema, CalorieCalculationSchema
from app.utils import HealthCalculations, convert_object_id

class HealthService:
    """Health calculations and tracking service"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.health_logs_collection = db.health_logs
        self.profiles_collection = db.profiles
    
    async def calculate_bmi(self, user_id: str, bmi_data: BMICalculationSchema) -> Dict[str, Any]:
        """Calculate BMI for user"""
        result = HealthCalculations.calculate_bmi(bmi_data.weight, bmi_data.height)
        
        # Update user's weight in profile if needed
        await self.profiles_collection.update_one(
            {"user_id": ObjectId(user_id)},
            {"$set": {"weight": bmi_data.weight, "height": bmi_data.height}}
        )
        
        return result
    
    async def calculate_calories(self, user_id: str, calorie_data: CalorieCalculationSchema) -> Dict[str, Any]:
        """Calculate daily calorie requirements"""
        # Calculate BMR
        bmr = HealthCalculations.calculate_bmr(
            calorie_data.age,
            calorie_data.weight,
            calorie_data.height,
            calorie_data.gender
        )
        
        # Calculate TDEE
        tdee = HealthCalculations.calculate_tdee(bmr, calorie_data.activity_level)
        
        # Get profile for fitness goal
        profile = await self.profiles_collection.find_one({"user_id": ObjectId(user_id)})
        
        # Adjust calories based on goal
        daily_calories = tdee
        if profile:
            goal = profile.get("fitness_goal", "maintain")
            if goal == "weight_loss":
                daily_calories = tdee - 500  # 500 calorie deficit
            elif goal == "weight_gain":
                daily_calories = tdee + 500  # 500 calorie surplus
        
        # Calculate macros
        macros = HealthCalculations.calculate_macros(daily_calories, profile.get("fitness_goal", "maintain") if profile else "maintain")
        
        return {
            "bmr": bmr,
            "tdee": tdee,
            "daily_calories": round(daily_calories),
            "macros": macros,
            "recommendation": f"Consume {round(daily_calories)} calories per day with {macros['protein_grams']}g protein"
        }
    
    async def calculate_water_intake(self, weight_kg: float) -> Dict[str, Any]:
        """Calculate daily water intake recommendation"""
        water_ml = HealthCalculations.calculate_water_intake(weight_kg)
        
        return {
            "daily_water_ml": water_ml,
            "daily_water_liters": round(water_ml / 1000, 1),
            "glasses_per_day": round(water_ml / 250),
            "recommendation": f"Drink {round(water_ml / 1000, 1)}L of water daily ({round(water_ml / 250)} glasses)"
        }
    
    async def log_health_data(self, user_id: str, log_data: Dict[str, Any]) -> Dict[str, Any]:
        """Log or update health data for a specific date (smart upsert)"""
        # Parse or default log date
        log_date = log_data.get("log_date")
        if isinstance(log_date, str):
            try:
                log_date = datetime.fromisoformat(log_date.replace("Z", ""))
            except ValueError:
                log_date = datetime.utcnow()
        elif not isinstance(log_date, datetime):
            log_date = datetime.utcnow()
            
        # Get start and end of that day
        start_of_day = log_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)
        
        # Check if log already exists for this day
        existing_log = await self.health_logs_collection.find_one({
            "user_id": ObjectId(user_id),
            "log_date": {"$gte": start_of_day, "$lt": end_of_day}
        })
        
        if existing_log:
            # Update fields dynamically
            update_fields = {
                "steps": log_data.get("steps"),
                "water_intake": log_data.get("water_intake"),
                "calories_consumed": log_data.get("calories_consumed"),
                "exercise_duration": log_data.get("exercise_duration"),
                "sleep_hours": log_data.get("sleep_hours"),
                "weight": log_data.get("weight"),
                "mood": log_data.get("mood"),
                "notes": log_data.get("notes"),
                "updated_at": datetime.utcnow()
            }
            # Remove None values to avoid overwriting previously logged data with nulls
            update_fields = {k: v for k, v in update_fields.items() if v is not None}
            
            await self.health_logs_collection.update_one(
                {"_id": existing_log["_id"]},
                {"$set": update_fields}
            )
            
            updated_doc = await self.health_logs_collection.find_one({"_id": existing_log["_id"]})
            return convert_object_id(updated_doc)
        else:
            # Create a brand new daily entry
            health_log = {
                "user_id": ObjectId(user_id),
                "log_date": start_of_day,
                "steps": log_data.get("steps"),
                "water_intake": log_data.get("water_intake"),
                "calories_consumed": log_data.get("calories_consumed"),
                "exercise_duration": log_data.get("exercise_duration"),
                "sleep_hours": log_data.get("sleep_hours"),
                "weight": log_data.get("weight"),
                "mood": log_data.get("mood"),
                "notes": log_data.get("notes"),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            # Remove None values
            health_log = {k: v for k, v in health_log.items() if v is not None}
            
            result = await self.health_logs_collection.insert_one(health_log)
            health_log["_id"] = result.inserted_id
            
            return convert_object_id(health_log)
    
    async def get_today_logs(self, user_id: str) -> Dict[str, Any]:
        """Get today's health logs"""
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        
        logs = await self.health_logs_collection.find_one({
            "user_id": ObjectId(user_id),
            "log_date": {"$gte": today, "$lt": tomorrow}
        })
        
        return convert_object_id(logs) if logs else {}
    
    async def get_weekly_logs(self, user_id: str) -> List[Dict[str, Any]]:
        """Get weekly health logs"""
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = today - timedelta(days=7)
        
        logs = []
        async for log in self.health_logs_collection.find({
            "user_id": ObjectId(user_id),
            "log_date": {"$gte": week_ago}
        }).sort("log_date", -1):
            logs.append(convert_object_id(log))
        
        return logs
    
    async def get_monthly_logs(self, user_id: str) -> List[Dict[str, Any]]:
        """Get monthly health logs"""
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        # Sets to the first day of the current month
        month_start = today.replace(day=1)
        
        logs = []
        async for log in self.health_logs_collection.find({
            "user_id": ObjectId(user_id),
            "log_date": {"$gte": month_start}
        }).sort("log_date", -1):
            logs.append(convert_object_id(log))
        
        return logs
    
    async def get_health_stats(self, user_id: str) -> Dict[str, Any]:
        """Get health statistics"""
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow = today + timedelta(days=1)
        
        # Get today's logs
        today_logs = await self.health_logs_collection.find_one({
            "user_id": ObjectId(user_id),
            "log_date": {"$gte": today, "$lt": tomorrow}
        })
        
        # Get weekly logs for averages
        week_ago = today - timedelta(days=7)
        weekly_logs = []
        async for log in self.health_logs_collection.find({
            "user_id": ObjectId(user_id),
            "log_date": {"$gte": week_ago}
        }):
            weekly_logs.append(log)
        
        # Calculate averages
        week_steps = [log.get("steps", 0) for log in weekly_logs if log.get("steps")]
        week_calories = [log.get("calories_consumed", 0) for log in weekly_logs if log.get("calories_consumed")]
        week_sleep = [log.get("sleep_hours", 0) for log in weekly_logs if log.get("sleep_hours")]
        week_water = [log.get("water_intake", 0) for log in weekly_logs if log.get("water_intake")]
        
        return {
            "today": {
                "steps": today_logs.get("steps", 0) if today_logs else 0,
                "water": today_logs.get("water_intake", 0) if today_logs else 0,
                "calories": today_logs.get("calories_consumed", 0) if today_logs else 0,
                "exercise": today_logs.get("exercise_duration", 0) if today_logs else 0,
                "sleep": today_logs.get("sleep_hours", 0) if today_logs else 0,
                "mood": today_logs.get("mood") if today_logs else None
            },
            "weekly_average": {
                "steps": round(sum(week_steps) / len(week_steps)) if week_steps else 0,
                "calories": round(sum(week_calories) / len(week_calories)) if week_calories else 0,
                "sleep": round(sum(week_sleep) / len(week_sleep), 1) if week_sleep else 0,
                "water": round(sum(week_water) / len(week_water)) if week_water else 0
            }
        }
    
    async def delete_log(self, user_id: str, log_id: str) -> bool:
        """Delete health log"""
        result = await self.health_logs_collection.delete_one({
            "_id": ObjectId(log_id),
            "user_id": ObjectId(user_id)
        })
        return result.deleted_count > 0
    
    async def update_log(self, user_id: str, log_id: str, log_data: Dict[str, Any]) -> bool:
        """Update health log"""
        log_data["updated_at"] = datetime.utcnow()
        # Convert weight/sleep/steps to correct numeric types
        if "steps" in log_data and log_data["steps"] is not None:
            log_data["steps"] = int(log_data["steps"])
        if "water_intake" in log_data and log_data["water_intake"] is not None:
            log_data["water_intake"] = int(log_data["water_intake"])
        if "calories_consumed" in log_data and log_data["calories_consumed"] is not None:
            log_data["calories_consumed"] = int(log_data["calories_consumed"])
        if "exercise_duration" in log_data and log_data["exercise_duration"] is not None:
            log_data["exercise_duration"] = int(log_data["exercise_duration"])
        if "sleep_hours" in log_data and log_data["sleep_hours"] is not None:
            log_data["sleep_hours"] = float(log_data["sleep_hours"])
        if "weight" in log_data and log_data["weight"] is not None:
            log_data["weight"] = float(log_data["weight"])
        if "mood" in log_data and log_data["mood"] is not None:
            log_data["mood"] = int(log_data["mood"])
            
        # Strip out _id if present in body
        log_data.pop("_id", None)
        log_data.pop("id", None)
        log_data.pop("user_id", None)
        
        result = await self.health_logs_collection.update_one(
            {
                "_id": ObjectId(log_id),
                "user_id": ObjectId(user_id)
            },
            {"$set": log_data}
        )
        return result.modified_count > 0
