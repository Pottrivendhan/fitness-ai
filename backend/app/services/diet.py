from datetime import datetime
from typing import Dict, Any, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.utils import convert_object_id

class DietService:
    """Service for handling daily diet plans, tracking meal completions, and searching food databases"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.diet_plans_collection = db.diet_plans
        self.profiles_collection = db.profiles
        self.foods_collection = db.foods

    async def get_or_create_today_plan(self, user_id: str) -> Dict[str, Any]:
        """Fetch today's diet plan, or dynamically generate a custom plan based on user metrics"""
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        
        # Check if plan already exists for today
        existing_plan = await self.diet_plans_collection.find_one({
            "user_id": ObjectId(user_id),
            "date": today_str
        })
        
        if existing_plan:
            return convert_object_id(existing_plan)
            
        # If not, generate a plan based on user's profile and calorie recommendation
        profile = await self.profiles_collection.find_one({"user_id": ObjectId(user_id)})
        
        # Target Calories & water
        calories_target = 2000
        water_target_liters = 2.5
        goal = "maintain"
        
        if profile:
            calories_target = profile.get("daily_calorie_goal") or profile.get("daily_calorie_recommendation") or 2000
            water_target_ml = profile.get("water_intake_goal") or 2500
            water_target_liters = round(water_target_ml / 1000, 1)
            goal = (profile.get("goal") or profile.get("fitness_goal") or "maintain").lower()
            
        # Target macros split
        if "loss" in goal:
            p_pct, c_pct, f_pct = 0.40, 0.35, 0.25 # high protein, lower carb
        elif "gain" in goal or "muscle" in goal:
            p_pct, c_pct, f_pct = 0.35, 0.45, 0.20 # high carb, high protein
        else:
            p_pct, c_pct, f_pct = 0.30, 0.50, 0.20 # balanced
            
        protein_target = round((calories_target * p_pct) / 4)
        carbs_target = round((calories_target * c_pct) / 4)
        fat_target = round((calories_target * f_pct) / 9)
        
        # Meal template generation scaled dynamically
        meals_def = {
            "breakfast": {
                "name": "Scrambled Eggs with Spinach & Whole Toast" if "loss" in goal else "Oatmeal with Banana & Peanut Butter",
                "cal_pct": 0.25
            },
            "morning_snack": {
                "name": "Mixed Berries" if "loss" in goal else "Whey Protein Shake & Banana",
                "cal_pct": 0.10
            },
            "lunch": {
                "name": "Grilled Tuna Salad with Olive Oil" if "loss" in goal else "Grilled Chicken Breast with Brown Rice & Broccoli",
                "cal_pct": 0.35
            },
            "evening_snack": {
                "name": "Celery Sticks with Hummus" if "loss" in goal else "Cottage Cheese with Pineapple",
                "cal_pct": 0.10
            },
            "dinner": {
                "name": "Baked Tofu with Asparagus & Mushrooms" if "loss" in goal else "Baked Salmon Fillet with Sweet Potato & Spinach",
                "cal_pct": 0.20
            }
        }
        
        meals = {}
        for key, data in meals_def.items():
            meal_cals = round(calories_target * data["cal_pct"])
            meals[key] = {
                "name": data["name"],
                "calories": meal_cals,
                "protein": round(protein_target * data["cal_pct"]),
                "carbs": round(carbs_target * data["cal_pct"]),
                "fat": round(fat_target * data["cal_pct"]),
                "is_completed": False
            }
            
        # Create plan document
        new_plan = {
            "user_id": ObjectId(user_id),
            "date": today_str,
            "calories_target": calories_target,
            "protein_target": protein_target,
            "carbs_target": carbs_target,
            "fat_target": fat_target,
            "water_target": water_target_liters,
            "meals": meals,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await self.diet_plans_collection.insert_one(new_plan)
        new_plan["_id"] = result.inserted_id
        
        return convert_object_id(new_plan)

    async def toggle_meal_completion(self, user_id: str, plan_id: str, meal_key: str, is_completed: bool) -> Optional[Dict[str, Any]]:
        """Toggle the completion flag of a specific meal inside a daily diet plan"""
        if not ObjectId.is_valid(plan_id):
            return None
            
        # Fetch the plan
        plan = await self.diet_plans_collection.find_one({
            "_id": ObjectId(plan_id),
            "user_id": ObjectId(user_id)
        })
        
        if not plan or "meals" not in plan or meal_key not in plan["meals"]:
            return None
            
        # Perform dynamic update
        await self.diet_plans_collection.update_one(
            {"_id": ObjectId(plan_id)},
            {
                "$set": {
                    f"meals.{meal_key}.is_completed": is_completed,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Return updated plan
        updated = await self.diet_plans_collection.find_one({"_id": ObjectId(plan_id)})
        return convert_object_id(updated)

    async def get_history(self, user_id: str) -> List[Dict[str, Any]]:
        """Fetch all daily logs sorted by date descending"""
        history = []
        cursor = self.diet_plans_collection.find({"user_id": ObjectId(user_id)}).sort("date", -1)
        async for doc in cursor:
            history.append(convert_object_id(doc))
        return history

    async def delete_plan(self, user_id: str, plan_id: str) -> bool:
        """Delete a daily plan by ID checking user ownership"""
        if not ObjectId.is_valid(plan_id):
            return False
            
        result = await self.diet_plans_collection.delete_one({
            "_id": ObjectId(plan_id),
            "user_id": ObjectId(user_id)
        })
        return result.deleted_count > 0

    async def search_foods(self, query: str) -> List[Dict[str, Any]]:
        """Search the foods collection using case-insensitive match on name"""
        results = []
        # If collection is empty, seed it first
        count = await self.foods_collection.count_documents({})
        if count == 0:
            await self.seed_foods()
            
        cursor = self.foods_collection.find({
            "name": {"$regex": query, "$options": "i"}
        }).limit(20)
        
        async for doc in cursor:
            results.append(convert_object_id(doc))
        return results

    async def seed_foods(self):
        """Seed default food options database"""
        seeds = [
            {"name": "Chicken Breast (Grilled)", "calories": 165.0, "protein": 31.0, "carbs": 0.0, "fat": 3.6, "serving_size": "100g"},
            {"name": "Salmon Fillet (Baked)", "calories": 206.0, "protein": 22.0, "carbs": 0.0, "fat": 12.0, "serving_size": "100g"},
            {"name": "Brown Rice (Cooked)", "calories": 111.0, "protein": 2.6, "carbs": 23.0, "fat": 0.9, "serving_size": "100g"},
            {"name": "Whole Eggs (Boiled)", "calories": 155.0, "protein": 13.0, "carbs": 1.1, "fat": 11.0, "serving_size": "100g"},
            {"name": "Broccoli (Steamed)", "calories": 35.0, "protein": 2.4, "carbs": 7.0, "fat": 0.4, "serving_size": "100g"},
            {"name": "Avocado", "calories": 160.0, "protein": 2.0, "carbs": 8.5, "fat": 14.7, "serving_size": "100g"},
            {"name": "Oatmeal (Raw Oats)", "calories": 389.0, "protein": 16.9, "carbs": 66.0, "fat": 6.9, "serving_size": "100g"},
            {"name": "Greek Yogurt (Non-fat)", "calories": 59.0, "protein": 10.0, "carbs": 3.6, "fat": 0.4, "serving_size": "100g"},
            {"name": "Sweet Potato (Baked)", "calories": 86.0, "protein": 1.6, "carbs": 20.0, "fat": 0.1, "serving_size": "100g"},
            {"name": "Almonds", "calories": 579.0, "protein": 21.0, "carbs": 22.0, "fat": 49.0, "serving_size": "100g"},
            {"name": "Banana", "calories": 89.0, "protein": 1.1, "carbs": 23.0, "fat": 0.3, "serving_size": "100g"},
            {"name": "Apple", "calories": 52.0, "protein": 0.3, "carbs": 14.0, "fat": 0.2, "serving_size": "100g"},
            {"name": "Spinach (Raw)", "calories": 23.0, "protein": 2.9, "carbs": 3.6, "fat": 0.4, "serving_size": "100g"},
            {"name": "Peanut Butter", "calories": 588.0, "protein": 25.0, "carbs": 20.0, "fat": 50.0, "serving_size": "100g"},
            {"name": "Tofu (Firm)", "calories": 144.0, "protein": 17.0, "carbs": 3.0, "fat": 8.0, "serving_size": "100g"},
            {"name": "Quinoa (Cooked)", "calories": 120.0, "protein": 4.4, "carbs": 21.3, "fat": 1.9, "serving_size": "100g"},
            {"name": "Tuna (Canned in Water)", "calories": 116.0, "protein": 26.0, "carbs": 0.0, "fat": 1.0, "serving_size": "100g"},
            {"name": "Cottage Cheese (Low-fat)", "calories": 82.0, "protein": 11.0, "carbs": 4.3, "fat": 2.3, "serving_size": "100g"},
            {"name": "Mixed Berries (Fresh)", "calories": 50.0, "protein": 1.0, "carbs": 12.0, "fat": 0.5, "serving_size": "100g"},
            {"name": "Whey Protein Powder", "calories": 400.0, "protein": 80.0, "carbs": 6.0, "fat": 6.0, "serving_size": "100g"}
        ]
        await self.foods_collection.insert_many(seeds)
        print("✓ Successfully seeded food options collection")
