import os
import io
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from PIL import Image
from app.schemas import UserProfileCreateSchema, UserProfileUpdateSchema
from app.utils import convert_object_id

# Mappings for frontend/backend goals and activity levels to keep compatibility
GOAL_MAP_FE_TO_BE = {
    "Weight Loss": "weight_loss",
    "Weight Gain": "weight_gain",
    "Muscle Gain": "muscle_building",
    "Maintain": "maintain"
}

GOAL_MAP_BE_TO_FE = {
    "weight_loss": "Weight Loss",
    "weight_gain": "Weight Gain",
    "muscle_building": "Muscle Gain",
    "maintain": "Maintain",
    "improve_endurance": "Maintain",
    "general_fitness": "Maintain"
}

ACTIVITY_MAP_FE_TO_BE = {
    "Sedentary": "sedentary",
    "Light": "lightly_active",
    "Moderate": "moderately_active",
    "Active": "very_active"
}

ACTIVITY_MAP_BE_TO_FE = {
    "sedentary": "Sedentary",
    "lightly_active": "Light",
    "moderately_active": "Moderate",
    "very_active": "Active",
    "extremely_active": "Active"
}

class ProfileService:
    """User profile service with BMI calculations, data integrity, and photo upload compression"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.profiles_collection = db.profiles
        self.users_collection = db.users
        
    def _calculate_bmi(self, weight: float, height: float) -> float:
        """Calculate BMI and round to 2 decimal places"""
        height_m = height / 100.0
        return round(weight / (height_m ** 2), 2)
        
    def _format_profile_doc(self, profile: Dict[str, Any], user_avatar: Optional[str] = None) -> Dict[str, Any]:
        """Format database profile document to match client-side expectations"""
        if not profile:
            return profile
            
        doc = convert_object_id(profile)
        # Convert DB activity_level (compatibility key) to frontend format if needed
        db_act = doc.get("activity_level", "sedentary")
        if db_act in ACTIVITY_MAP_BE_TO_FE:
            doc["activity_level"] = ACTIVITY_MAP_BE_TO_FE[db_act]
            
        # Convert DB goal (compatibility key) to frontend format if needed
        db_goal = doc.get("fitness_goal") or doc.get("goal") or "maintain"
        if db_goal in GOAL_MAP_BE_TO_FE:
            doc["goal"] = GOAL_MAP_BE_TO_FE[db_goal]
        else:
            doc["goal"] = db_goal
            
        # Add avatar_url from user document if not present
        if user_avatar and "avatar_url" not in doc:
            doc["avatar_url"] = user_avatar
            
        return doc

    async def create_profile(self, user_id: str, profile_data: UserProfileCreateSchema) -> Dict[str, Any]:
        """Create user profile and sync details with user account"""
        existing = await self.profiles_collection.find_one({"user_id": ObjectId(user_id)})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Profile already exists for this user"
            )
            
        # Fetch user email if not provided, or ensure match
        user = await self.users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User account not found"
            )
            
        # Calculate BMI on the backend to ensure data integrity
        bmi_value = self._calculate_bmi(profile_data.weight, profile_data.height)
        
        # Maps for backend compatibility
        fitness_goal_compat = GOAL_MAP_FE_TO_BE.get(profile_data.goal, "maintain")
        activity_level_compat = ACTIVITY_MAP_FE_TO_BE.get(profile_data.activity_level, "sedentary")
        
        profile_doc = {
            "user_id": ObjectId(user_id),
            "name": profile_data.name,
            "email": user["email"],  # Force email to match account email (read-only)
            "age": profile_data.age,
            "gender": profile_data.gender,
            "height": profile_data.height,
            "weight": profile_data.weight,
            "blood_group": profile_data.blood_group,
            "medical_conditions": profile_data.medical_conditions or [],
            "goal": profile_data.goal,
            "activity_level": activity_level_compat,  # Store compat enum key
            "bmi": bmi_value,
            
            # Compatibility fields for AI recommendation engine and trackers
            "fitness_goal": fitness_goal_compat,
            "diet_type": "non_vegetarian",
            "water_intake_goal": profile_data.daily_water_goal,
            "sleep_goal": profile_data.sleep_goal,
            "target_weight": profile_data.target_weight,
            
            # Future-proof / AI goals
            "daily_step_goal": profile_data.daily_step_goal,
            "daily_water_goal": profile_data.daily_water_goal,
            "daily_calorie_goal": profile_data.daily_calorie_goal,
            
            "avatar_url": user.get("avatar_url"),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Save profile
        result = await self.profiles_collection.insert_one(profile_doc)
        profile_doc["_id"] = result.inserted_id
        
        # Sync name and profile state in users collection
        await self.users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {
                "name": profile_data.name,
                "updated_at": datetime.utcnow()
            }}
        )
        
        return self._format_profile_doc(profile_doc, user.get("avatar_url"))

    async def get_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile"""
        profile = await self.profiles_collection.find_one({"user_id": ObjectId(user_id)})
        if not profile:
            return None
            
        user = await self.users_collection.find_one({"_id": ObjectId(user_id)})
        avatar_url = user.get("avatar_url") if user else None
        
        return self._format_profile_doc(profile, avatar_url)

    async def update_profile(self, user_id: str, profile_data: UserProfileUpdateSchema) -> Dict[str, Any]:
        """Update user profile and sync changes"""
        profile = await self.profiles_collection.find_one({"user_id": ObjectId(user_id)})
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
            
        update_data = {}
        
        # Calculate new BMI if height/weight change
        weight = profile_data.weight if profile_data.weight is not None else profile.get("weight")
        height = profile_data.height if profile_data.height is not None else profile.get("height")
        if weight and height:
            update_data["bmi"] = self._calculate_bmi(weight, height)
            
        # Update user name if provided
        if profile_data.name is not None:
            update_data["name"] = profile_data.name
            await self.users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"name": profile_data.name, "updated_at": datetime.utcnow()}}
            )
            
        # Map values if updated
        if profile_data.age is not None:
            update_data["age"] = profile_data.age
        if profile_data.gender is not None:
            update_data["gender"] = profile_data.gender
        if profile_data.height is not None:
            update_data["height"] = profile_data.height
        if profile_data.weight is not None:
            update_data["weight"] = profile_data.weight
        if profile_data.blood_group is not None:
            update_data["blood_group"] = profile_data.blood_group
        if profile_data.medical_conditions is not None:
            update_data["medical_conditions"] = profile_data.medical_conditions
            
        if profile_data.goal is not None:
            update_data["goal"] = profile_data.goal
            update_data["fitness_goal"] = GOAL_MAP_FE_TO_BE.get(profile_data.goal, "maintain")
            
        if profile_data.activity_level is not None:
            update_data["activity_level"] = ACTIVITY_MAP_FE_TO_BE.get(profile_data.activity_level, "sedentary")
            
        # Future-proof goals
        if profile_data.daily_step_goal is not None:
            update_data["daily_step_goal"] = profile_data.daily_step_goal
        if profile_data.daily_water_goal is not None:
            update_data["daily_water_goal"] = profile_data.daily_water_goal
            update_data["water_intake_goal"] = profile_data.daily_water_goal
        if profile_data.daily_calorie_goal is not None:
            update_data["daily_calorie_goal"] = profile_data.daily_calorie_goal
        if profile_data.sleep_goal is not None:
            update_data["sleep_goal"] = profile_data.sleep_goal
        if profile_data.target_weight is not None:
            update_data["target_weight"] = profile_data.target_weight
            
        update_data["updated_at"] = datetime.utcnow()
        
        await self.profiles_collection.update_one(
            {"user_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        return await self.get_profile(user_id)

    async def get_user_full_info(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get full user information including profile"""
        user = await self.users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            return None
            
        profile = await self.get_profile(user_id)
        
        user_data = convert_object_id(user)
        user_data["profile"] = profile
        user_data.pop("password_hash", None)
        
        return user_data

    async def update_user_info(self, user_id: str, name: Optional[str] = None, avatar_url: Optional[str] = None) -> Dict[str, Any]:
        """Update user information and sync back to profile"""
        update_data = {"updated_at": datetime.utcnow()}
        
        if name:
            update_data["name"] = name
        if avatar_url:
            update_data["avatar_url"] = avatar_url
            
        await self.users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        # Sync back to profile if profile exists
        profile_update = {}
        if name:
            profile_update["name"] = name
        if avatar_url:
            profile_update["avatar_url"] = avatar_url
            
        if profile_update:
            await self.profiles_collection.update_one(
                {"user_id": ObjectId(user_id)},
                {"$set": profile_update}
            )
            
        return await self.get_user_full_info(user_id)

    async def upload_profile_avatar(self, user_id: str, file: UploadFile, upload_dir: str) -> str:
        """Handle, validate, compress and store profile picture, updating DB"""
        # Validate extension
        filename = file.filename or ""
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        if ext not in ["jpg", "jpeg", "png", "webp"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file format. Only JPG, PNG, and WEBP are allowed."
            )
            
        # Create upload folder if not exists
        os.makedirs(upload_dir, exist_ok=True)
        
        # Read contents
        contents = await file.read()
        file_size = len(contents)
        
        # Compress image if size > 2 MB
        if file_size > 2 * 1024 * 1024:
            try:
                img = Image.open(io.BytesIO(contents))
                # Preserve transparency if WebP or PNG
                if img.mode in ("RGBA", "P") and ext in ["png", "webp"]:
                    # Keep RGBA format
                    pass
                else:
                    img = img.convert("RGB")
                    
                output = io.BytesIO()
                # Determine formats
                save_format = "PNG" if ext == "png" else ("WEBP" if ext == "webp" else "JPEG")
                img.save(output, format=save_format, quality=80, optimize=True)
                contents = output.getvalue()
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Error processing image: {str(e)}"
                )
                
        # Generate unique filename to prevent caching/overwrites
        unique_filename = f"{user_id}_{int(datetime.utcnow().timestamp())}.{ext}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Write file
        with open(file_path, "wb") as f:
            f.write(contents)
            
        # Save relative URL path to MongoDB
        avatar_url = f"/uploads/{unique_filename}"
        await self.update_user_info(user_id, avatar_url=avatar_url)
        
        return avatar_url

    async def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """Get user statistics"""
        profile = await self.profiles_collection.find_one({"user_id": ObjectId(user_id)})
        if not profile:
            return {}
            
        height_m = profile["height"] / 100
        bmi = profile["weight"] / (height_m ** 2)
        
        return {
            "current_weight": profile["weight"],
            "target_weight": profile.get("target_weight"),
            "height": profile["height"],
            "bmi": round(bmi, 2),
            "fitness_goal": profile.get("goal") or GOAL_MAP_BE_TO_FE.get(profile.get("fitness_goal", "maintain"), "Maintain"),
            "activity_level": ACTIVITY_MAP_BE_TO_FE.get(profile.get("activity_level", "sedentary"), "Sedentary"),
            "water_intake_goal": profile.get("daily_water_goal") or profile.get("water_intake_goal", 2000),
            "sleep_goal": profile.get("sleep_goal", 8)
        }

    async def list_all_users(self, skip: int = 0, limit: int = 10) -> Dict[str, Any]:
        """List all users (admin function)"""
        users = []
        async for user in self.users_collection.find().skip(skip).limit(limit):
            user_data = convert_object_id(user)
            user_data.pop("password_hash", None)
            profile = await self.get_profile(str(user["_id"]))
            user_data["profile"] = profile
            users.append(user_data)
            
        total = await self.users_collection.count_documents({})
        return {
            "users": users,
            "total": total,
            "skip": skip,
            "limit": limit
        }

    async def search_users(self, query: str, skip: int = 0, limit: int = 10) -> Dict[str, Any]:
        """Search users by name or email"""
        search_filter = {
            "$or": [
                {"email": {"$regex": query, "$options": "i"}},
                {"name": {"$regex": query, "$options": "i"}}
            ]
        }
        
        users = []
        async for user in self.users_collection.find(search_filter).skip(skip).limit(limit):
            user_data = convert_object_id(user)
            user_data.pop("password_hash", None)
            profile = await self.get_profile(str(user["_id"]))
            user_data["profile"] = profile
            users.append(user_data)
            
        total = await self.users_collection.count_documents(search_filter)
        return {
            "users": users,
            "total": total,
            "skip": skip,
            "limit": limit
        }
