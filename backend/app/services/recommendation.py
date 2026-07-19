from datetime import datetime
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.ai.recommendation import recommendation_engine
from app.utils import convert_object_id, generate_id
import logging

logger = logging.getLogger(__name__)

class RecommendationService:
    """Workout and diet recommendation service"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.workouts_collection = db.workouts
        self.diet_plans_collection = db.diet_plans
        self.profiles_collection = db.profiles
        self.workout_plans_collection = db.workout_plans
    
    async def recommend_workout(self, user_id: str, preferences: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generate personalized workout recommendation"""
        logger.info(f"Generating workout recommendation for user {user_id} with preferences: {preferences}")
        # Get user profile
        profile = await self.profiles_collection.find_one({"user_id": ObjectId(user_id)})
        if not profile:
            logger.warning(f"Failed to generate workout recommendation: profile not found for user {user_id}")
            return {"error": "User profile not found"}
        
        # Prepare data for AI model
        user_data = {
            "age": profile.get("age"),
            "weight": profile.get("weight"),
            "height": profile.get("height"),
            "gender": profile.get("gender"),
            "activity_level": profile.get("activity_level"),
            "fitness_goal": profile.get("fitness_goal"),
            "bmi": self._calculate_bmi(profile.get("weight"), profile.get("height"))
        }
        
        # Get AI recommendation
        recommendation = recommendation_engine.predict_workout(user_data)
        recommendation["recommendation_id"] = generate_id()
        recommendation["user_id"] = user_id
        recommendation["created_at"] = datetime.utcnow()
        recommendation["updated_at"] = datetime.utcnow()
        
        # Store in database
        result = await self.workouts_collection.insert_one(recommendation)
        recommendation["_id"] = result.inserted_id
        
        logger.info(f"Workout recommendation generated successfully for user {user_id}: {recommendation['recommendation_id']}")
        return convert_object_id(recommendation)
    
    async def recommend_diet(self, user_id: str, preferences: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generate personalized diet recommendation"""
        logger.info(f"Generating diet recommendation for user {user_id} with preferences: {preferences}")
        # Get user profile
        profile = await self.profiles_collection.find_one({"user_id": ObjectId(user_id)})
        if not profile:
            logger.warning(f"Failed to generate diet recommendation: profile not found for user {user_id}")
            return {"error": "User profile not found"}
        
        # Prepare data for AI model
        user_data = {
            "age": profile.get("age"),
            "weight": profile.get("weight"),
            "height": profile.get("height"),
            "gender": profile.get("gender"),
            "activity_level": profile.get("activity_level"),
            "fitness_goal": profile.get("fitness_goal"),
            "diet_type": profile.get("diet_type"),
            "medical_conditions": profile.get("medical_conditions", []),
            "bmi": self._calculate_bmi(profile.get("weight"), profile.get("height"))
        }
        
        # Get AI recommendation
        recommendation = recommendation_engine.predict_diet(user_data)
        recommendation["recommendation_id"] = generate_id()
        recommendation["user_id"] = user_id
        recommendation["created_at"] = datetime.utcnow()
        recommendation["updated_at"] = datetime.utcnow()
        
        # Store in database
        result = await self.diet_plans_collection.insert_one(recommendation)
        recommendation["_id"] = result.inserted_id
        
        logger.info(f"Diet recommendation generated successfully for user {user_id}: {recommendation['recommendation_id']}")
        return convert_object_id(recommendation)
    
    async def get_workout_recommendation(self, recommendation_id: str) -> Optional[Dict[str, Any]]:
        """Get specific workout recommendation"""
        workout = await self.workouts_collection.find_one({"recommendation_id": recommendation_id})
        if workout:
            return convert_object_id(workout)
        return None
    
    async def get_diet_recommendation(self, recommendation_id: str) -> Optional[Dict[str, Any]]:
        """Get specific diet recommendation"""
        diet = await self.diet_plans_collection.find_one({"recommendation_id": recommendation_id})
        if diet:
            return convert_object_id(diet)
        return None
    
    async def get_user_workout_recommendations(self, user_id: str, limit: int = 5) -> list:
        """Get user's workout recommendations"""
        recommendations = []
        async for workout in self.workouts_collection.find(
            {"user_id": user_id}
        ).sort("created_at", -1).limit(limit):
            recommendations.append(convert_object_id(workout))
        
        return recommendations
    
    async def get_user_diet_recommendations(self, user_id: str, limit: int = 5) -> list:
        """Get user's diet recommendations"""
        recommendations = []
        async for diet in self.diet_plans_collection.find(
            {"user_id": user_id}
        ).sort("created_at", -1).limit(limit):
            recommendations.append(convert_object_id(diet))
        
        return recommendations
    
    async def get_latest_recommendations(self, user_id: str) -> Dict[str, Any]:
        """Get latest workout and diet recommendations"""
        latest_workout = await self.workouts_collection.find_one(
            {"user_id": user_id},
            sort=[("created_at", -1)]
        )
        
        latest_diet = await self.diet_plans_collection.find_one(
            {"user_id": user_id},
            sort=[("created_at", -1)]
        )
        
        return {
            "workout": convert_object_id(latest_workout) if latest_workout else None,
            "diet": convert_object_id(latest_diet) if latest_diet else None
        }
    
    async def delete_workout_recommendation(self, user_id: str, recommendation_id: str) -> bool:
        """Delete workout recommendation"""
        result = await self.workouts_collection.delete_one({
            "recommendation_id": recommendation_id,
            "user_id": user_id
        })
        return result.deleted_count > 0
    
    async def delete_diet_recommendation(self, user_id: str, recommendation_id: str) -> bool:
        """Delete diet recommendation"""
        result = await self.diet_plans_collection.delete_one({
            "recommendation_id": recommendation_id,
            "user_id": user_id
        })
        return result.deleted_count > 0
    
    def _calculate_bmi(self, weight_kg: float, height_cm: float) -> float:
        """Calculate BMI"""
        height_m = height_cm / 100
        return round(weight_kg / (height_m ** 2), 1)
    
    async def get_recommendation_history(self, user_id: str, type: str = "both") -> Dict[str, Any]:
        """Get recommendation history"""
        history = {
            "workouts": [],
            "diets": []
        }
        
        if type in ["workout", "both"]:
            async for workout in self.workouts_collection.find(
                {"user_id": user_id}
            ).sort("created_at", -1):
                history["workouts"].append(convert_object_id(workout))
        
        if type in ["diet", "both"]:
            async for diet in self.diet_plans_collection.find(
                {"user_id": user_id}
            ).sort("created_at", -1):
                history["diets"].append(convert_object_id(diet))
        
        return history

    async def get_today_workout_plan(self, user_id: str) -> Dict[str, Any]:
        """Get or generate today's daily workout plan"""
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        
        # Check if plan already exists for today
        existing_plan = await self.workout_plans_collection.find_one({
            "user_id": ObjectId(user_id),
            "date": today_str
        })
        if existing_plan:
            return convert_object_id(existing_plan)
            
        # Get user profile
        profile = await self.profiles_collection.find_one({"user_id": ObjectId(user_id)})
        if not profile:
            return {"error": "User profile not found"}
            
        # Get latest weekly workout recommendation
        latest_weekly = await self.workouts_collection.find_one(
            {"user_id": user_id},
            sort=[("created_at", -1)]
        )
        if not latest_weekly:
            # Generate new weekly recommendation
            latest_weekly = await self.recommend_workout(user_id)
            if "error" in latest_weekly:
                return latest_weekly
            
        # Find exercises for today's weekday
        today_weekday = datetime.utcnow().strftime("%A")
        
        schedule = latest_weekly.get("weekly_schedule", [])
        today_workout = None
        for day in schedule:
            if day.get("day") == today_weekday:
                today_workout = day
                break
                
        exercises = []
        name = "Daily Fitness Routine"
        difficulty = "intermediate"
        duration_minutes = 30
        calories_burned = 200
        
        if today_workout and not today_workout.get("rest_days", False):
            name = f"{today_workout.get('workout_type', 'General').title()} Session"
            difficulty = today_workout.get("difficulty", "intermediate")
            duration_minutes = today_workout.get("duration_minutes", 30)
            
            raw_exercises = today_workout.get("exercises", [])
            for raw_ex in raw_exercises:
                exercises.append({
                    "name": raw_ex.get("name", "Exercise"),
                    "sets": raw_ex.get("sets", 3),
                    "reps": raw_ex.get("reps", 10),
                    "rest_seconds": raw_ex.get("rest_seconds", 30),
                    "duration_seconds": raw_ex.get("duration_seconds", 0),
                    "calories_burned": raw_ex.get("calories_burned", 50),
                    "description": raw_ex.get("description", "Perform exercise with proper form"),
                    "form_tips": raw_ex.get("form_tips", ["Keep your core engaged"]),
                    "is_completed": False
                })
        else:
            # It's a rest day or we didn't find a scheduled workout
            goal = profile.get("fitness_goal", "maintain")
            name = "Rest & Recovery Stretch"
            difficulty = "beginner"
            duration_minutes = 15
            
            if goal in ["weight_loss", "muscle_gain"]:
                exercises = [
                    {
                        "name": "Child's Pose Stretch",
                        "sets": 1,
                        "reps": 1,
                        "rest_seconds": 15,
                        "duration_seconds": 60,
                        "calories_burned": 10,
                        "description": "Rest your hips on your heels, crawl your hands forward on the floor and rest your forehead.",
                        "form_tips": ["Breathe deeply", "Relax shoulders"],
                        "is_completed": False
                    },
                    {
                        "name": "Cat-Cow Stretch",
                        "sets": 1,
                        "reps": 10,
                        "rest_seconds": 15,
                        "duration_seconds": 60,
                        "calories_burned": 15,
                        "description": "On all fours, alternate between arching your back toward the ceiling and dipping it toward the floor.",
                        "form_tips": ["Move with your breath", "Keep hands under shoulders"],
                        "is_completed": False
                    },
                    {
                        "name": "Hamstring Stretch",
                        "sets": 2,
                        "reps": 5,
                        "rest_seconds": 20,
                        "duration_seconds": 60,
                        "calories_burned": 15,
                        "description": "Sit on the floor with one leg straight, bend the other and reach forward to touch your toes.",
                        "form_tips": ["Do not bounce", "Keep straight leg flat"],
                        "is_completed": False
                    }
                ]
            else:
                exercises = [
                    {
                        "name": "Deep Breathing & Meditation",
                        "sets": 1,
                        "reps": 1,
                        "rest_seconds": 0,
                        "duration_seconds": 300,
                        "calories_burned": 10,
                        "description": "Sit comfortably, close your eyes, and focus on slow, deep breathing.",
                        "form_tips": ["Keep back straight", "Clear your mind"],
                        "is_completed": False
                    },
                    {
                        "name": "Gentle Neck and Shoulder Rolls",
                        "sets": 2,
                        "reps": 10,
                        "rest_seconds": 10,
                        "duration_seconds": 60,
                        "calories_burned": 10,
                        "description": "Gently roll your head in a circle, then roll your shoulders backward and forward.",
                        "form_tips": ["Move slowly", "Stop if you feel pinch"],
                        "is_completed": False
                    }
                ]
                
        calories_burned = sum(e["calories_burned"] for e in exercises)
        
        new_plan = {
            "plan_id": generate_id(),
            "user_id": ObjectId(user_id),
            "name": name,
            "difficulty": difficulty,
            "duration_minutes": duration_minutes,
            "calories_burned": calories_burned,
            "exercises": exercises,
            "is_completed": False,
            "completed_at": None,
            "date": today_str,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await self.workout_plans_collection.insert_one(new_plan)
        return convert_object_id(new_plan)

    async def create_workout_plan(self, user_id: str, plan_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a custom workout plan"""
        plan = {
            "plan_id": generate_id(),
            "user_id": ObjectId(user_id),
            "name": plan_data.get("name"),
            "difficulty": plan_data.get("difficulty", "intermediate"),
            "duration_minutes": plan_data.get("duration_minutes", 30),
            "calories_burned": plan_data.get("calories_burned", 0),
            "exercises": plan_data.get("exercises", []),
            "is_completed": plan_data.get("is_completed", False),
            "completed_at": None,
            "date": plan_data.get("date", datetime.utcnow().strftime("%Y-%m-%d")),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        formatted_exercises = []
        for ex in plan["exercises"]:
            formatted_exercises.append({
                "name": ex.get("name"),
                "sets": ex.get("sets", 3),
                "reps": ex.get("reps", 10),
                "rest_seconds": ex.get("rest_seconds", 30),
                "duration_seconds": ex.get("duration_seconds", 0),
                "calories_burned": ex.get("calories_burned", 0),
                "description": ex.get("description", ""),
                "form_tips": ex.get("form_tips", []),
                "is_completed": ex.get("is_completed", False)
            })
        plan["exercises"] = formatted_exercises
        
        if plan["calories_burned"] == 0:
            plan["calories_burned"] = sum(e["calories_burned"] for e in formatted_exercises)
            
        await self.workout_plans_collection.insert_one(plan)
        return convert_object_id(plan)

    async def get_workout_plan(self, user_id: str, plan_id: str) -> Optional[Dict[str, Any]]:
        """Get specific workout plan details"""
        plan = await self.workout_plans_collection.find_one({
            "plan_id": plan_id,
            "user_id": ObjectId(user_id)
        })
        if plan:
            return convert_object_id(plan)
        return None

    async def update_workout_plan(self, user_id: str, plan_id: str, plan_data: Dict[str, Any]) -> bool:
        """Update workout plan details"""
        plan_data["updated_at"] = datetime.utcnow()
        plan_data.pop("_id", None)
        plan_data.pop("plan_id", None)
        plan_data.pop("user_id", None)
        
        # Ensure correct types in nested exercises if they exist
        if "exercises" in plan_data:
            formatted = []
            for ex in plan_data["exercises"]:
                formatted.append({
                    "name": ex.get("name"),
                    "sets": int(ex.get("sets", 3)),
                    "reps": int(ex.get("reps", 10)),
                    "rest_seconds": int(ex.get("rest_seconds", 30)),
                    "duration_seconds": int(ex.get("duration_seconds", 0)),
                    "calories_burned": int(ex.get("calories_burned", 0)),
                    "description": ex.get("description", ""),
                    "form_tips": ex.get("form_tips", []),
                    "is_completed": bool(ex.get("is_completed", False))
                })
            plan_data["exercises"] = formatted
            
        result = await self.workout_plans_collection.update_one(
            {
                "plan_id": plan_id,
                "user_id": ObjectId(user_id)
            },
            {"$set": plan_data}
        )
        return result.modified_count > 0

    async def delete_workout_plan(self, user_id: str, plan_id: str) -> bool:
        """Delete workout plan"""
        result = await self.workout_plans_collection.delete_one({
            "plan_id": plan_id,
            "user_id": ObjectId(user_id)
        })
        return result.deleted_count > 0

    async def toggle_exercise_completion(self, user_id: str, plan_id: str, exercise_name: str, is_completed: bool) -> Optional[Dict[str, Any]]:
        """Toggle is_completed status on a specific exercise inside a plan"""
        plan = await self.workout_plans_collection.find_one({
            "plan_id": plan_id,
            "user_id": ObjectId(user_id)
        })
        if not plan:
            return None
            
        exercises = plan.get("exercises", [])
        for ex in exercises:
            if ex.get("name") == exercise_name:
                ex["is_completed"] = is_completed
                break
                
        all_completed = len(exercises) > 0 and all(ex.get("is_completed", False) for ex in exercises)
        
        update_fields = {
            "exercises": exercises,
            "is_completed": all_completed,
            "completed_at": datetime.utcnow() if all_completed else None,
            "updated_at": datetime.utcnow()
        }
        
        await self.workout_plans_collection.update_one(
            {"_id": plan["_id"]},
            {"$set": update_fields}
        )
        
        updated_doc = await self.workout_plans_collection.find_one({"_id": plan["_id"]})
        return convert_object_id(updated_doc)

    async def toggle_workout_completion(self, user_id: str, plan_id: str, is_completed: bool) -> Optional[Dict[str, Any]]:
        """Toggle is_completed status on the entire plan"""
        plan = await self.workout_plans_collection.find_one({
            "plan_id": plan_id,
            "user_id": ObjectId(user_id)
        })
        if not plan:
            return None
            
        exercises = plan.get("exercises", [])
        for ex in exercises:
            ex["is_completed"] = is_completed
            
        update_fields = {
            "exercises": exercises,
            "is_completed": is_completed,
            "completed_at": datetime.utcnow() if is_completed else None,
            "updated_at": datetime.utcnow()
        }
        
        await self.workout_plans_collection.update_one(
            {"_id": plan["_id"]},
            {"$set": update_fields}
        )
        
        updated_doc = await self.workout_plans_collection.find_one({"_id": plan["_id"]})
        return convert_object_id(updated_doc)

    async def get_workout_plan_history(self, user_id: str) -> List[Dict[str, Any]]:
        """Get history logs of all daily workout plans"""
        history = []
        async for plan in self.workout_plans_collection.find(
            {"user_id": ObjectId(user_id)}
        ).sort("date", -1):
            history.append(convert_object_id(plan))
        return history
