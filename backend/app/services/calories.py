from datetime import datetime
from typing import Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.schemas import CalorieCalculationSchema
from app.utils import HealthCalculations, convert_object_id

class CalorieService:
    """Service for calorie calculations, macronutrient distribution, and history tracking in MongoDB"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.calorie_history_collection = db.calorie_history
        self.profiles_collection = db.profiles
        
    async def calculate_and_save(self, user_id: str, calorie_data: CalorieCalculationSchema) -> Dict[str, Any]:
        """Calculate BMR, TDEE, recommended calories + macros for goals, water intake, and save to history"""
        # Extract string value from Enums
        gender_val = calorie_data.gender.value if hasattr(calorie_data.gender, "value") else str(calorie_data.gender)
        activity_val = calorie_data.activity_level.value if hasattr(calorie_data.activity_level, "value") else str(calorie_data.activity_level)

        # BMR (using Mifflin-St Jeor)
        bmr = HealthCalculations.calculate_bmr(
            calorie_data.age,
            calorie_data.weight,
            calorie_data.height,
            gender_val
        )
        
        # TDEE
        tdee = HealthCalculations.calculate_tdee(bmr, activity_val)
        
        # Calories for each goal
        maintenance_calories = round(tdee)
        weight_loss_calories = round(tdee - 500)
        weight_gain_calories = round(tdee + 500)
        
        # Macros for each goal
        maintenance_macros = HealthCalculations.calculate_macros(maintenance_calories, "maintain")
        weight_loss_macros = HealthCalculations.calculate_macros(weight_loss_calories, "weight_loss")
        weight_gain_macros = HealthCalculations.calculate_macros(weight_gain_calories, "muscle_building")
        
        # Water recommended intake
        water_intake_ml = HealthCalculations.calculate_water_intake(calorie_data.weight)
        
        # Prepare history log structure
        history_item = {
            "user_id": ObjectId(user_id),
            "age": calorie_data.age,
            "gender": gender_val,
            "weight": calorie_data.weight,
            "height": calorie_data.height,
            "activity_level": activity_val,
            "bmr": bmr,
            "tdee": tdee,
            "maintenance_calories": maintenance_calories,
            "weight_loss_calories": weight_loss_calories,
            "weight_gain_calories": weight_gain_calories,
            "maintenance_macros": maintenance_macros,
            "weight_loss_macros": weight_loss_macros,
            "weight_gain_macros": weight_gain_macros,
            "water_intake_ml": water_intake_ml,
            "created_at": datetime.utcnow()
        }
        
        insert_result = await self.calorie_history_collection.insert_one(history_item)
        history_item["_id"] = insert_result.inserted_id
        
        # Profile sync mappings
        activity_map = {
            "sedentary": "Sedentary",
            "lightly_active": "Light",
            "moderately_active": "Moderate",
            "very_active": "Active",
            "extremely_active": "Active"
        }
        
        # Sync to user profile for general application updates
        profile_act = activity_map.get(activity_val, "Moderate")
        profile_gender = gender_val.capitalize()
        
        # We also want to update the profile's calorie goal if the user profile exists and has a fitness goal
        # Find user profile first
        profile = await self.profiles_collection.find_one({"user_id": ObjectId(user_id)})
        calorie_goal = maintenance_calories
        
        if profile:
            # check the profile goal
            goal = profile.get("goal") or profile.get("fitness_goal", "maintain")
            if goal in ["weight_loss", "Weight Loss"]:
                calorie_goal = weight_loss_calories
            elif goal in ["weight_gain", "muscle_building", "Weight Gain", "Muscle Gain"]:
                calorie_goal = weight_gain_calories

        await self.profiles_collection.update_one(
            {"user_id": ObjectId(user_id)},
            {
                "$set": {
                    "age": calorie_data.age,
                    "gender": profile_gender,
                    "weight": calorie_data.weight,
                    "height": calorie_data.height,
                    "activity_level": profile_act,
                    "water_intake_goal": water_intake_ml,
                    "daily_calorie_goal": calorie_goal,
                    "updated_at": datetime.utcnow()
                }
            },
            upsert=True
        )
        
        return convert_object_id(history_item)
        
    async def get_history(self, user_id: str) -> List[Dict[str, Any]]:
        """Retrieve user's calculation history from db sorted by created_at descending"""
        history = []
        cursor = self.calorie_history_collection.find({"user_id": ObjectId(user_id)}).sort("created_at", -1)
        async for doc in cursor:
            history.append(convert_object_id(doc))
        return history
        
    async def delete_item(self, user_id: str, item_id: str) -> bool:
        """Delete an entry checking user ownership"""
        if not ObjectId.is_valid(item_id):
            return False
        result = await self.calorie_history_collection.delete_one({
            "_id": ObjectId(item_id),
            "user_id": ObjectId(user_id)
        })
        return result.deleted_count > 0
