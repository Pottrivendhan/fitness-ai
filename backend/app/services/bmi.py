from datetime import datetime
from typing import Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.schemas import BMICalculationSchema
from app.utils import HealthCalculations, convert_object_id

class BMIService:
    """Service for BMI calculations and history tracking in MongoDB"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.bmi_history_collection = db.bmi_history
        self.profiles_collection = db.profiles
        
    async def calculate_and_save(self, user_id: str, bmi_data: BMICalculationSchema) -> Dict[str, Any]:
        """Calculate BMI, update profile, and save calculation to history"""
        result = HealthCalculations.calculate_bmi(bmi_data.weight, bmi_data.height)
        
        history_item = {
            "user_id": ObjectId(user_id),
            "weight": bmi_data.weight,
            "height": bmi_data.height,
            "bmi": result["bmi"],
            "category": result["category"],
            "ideal_weight_min": result["ideal_weight_min"],
            "ideal_weight_max": result["ideal_weight_max"],
            "recommendation": result["recommendation"],
            "created_at": datetime.utcnow()
        }
        
        insert_result = await self.bmi_history_collection.insert_one(history_item)
        history_item["_id"] = insert_result.inserted_id
        
        # Update user's profile weight and height
        await self.profiles_collection.update_one(
            {"user_id": ObjectId(user_id)},
            {
                "$set": {
                    "weight": bmi_data.weight,
                    "height": bmi_data.height,
                    "updated_at": datetime.utcnow()
                }
            },
            upsert=True
        )
        
        return convert_object_id(history_item)
        
    async def get_history(self, user_id: str) -> List[Dict[str, Any]]:
        """Retrieve user's BMI history sorted by created_at descending"""
        history = []
        cursor = self.bmi_history_collection.find({"user_id": ObjectId(user_id)}).sort("created_at", -1)
        async for doc in cursor:
            history.append(convert_object_id(doc))
        return history
        
    async def delete_item(self, user_id: str, item_id: str) -> bool:
        """Delete a BMI history entry by ID checking ownership"""
        if not ObjectId.is_valid(item_id):
            return False
        result = await self.bmi_history_collection.delete_one({
            "_id": ObjectId(item_id),
            "user_id": ObjectId(user_id)
        })
        return result.deleted_count > 0
