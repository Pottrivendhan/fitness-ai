from datetime import datetime
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.utils import convert_object_id

class SettingsService:
    """Service to handle user app settings and data management"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.settings_collection = db.settings
        self.users_collection = db.users
        
    def _get_default_settings(self, user_id: str) -> Dict[str, Any]:
        """Generate a default settings structure"""
        return {
            "user_id": ObjectId(user_id),
            "appearance": {
                "theme": "system",
                "accent_color": "blue",
                "font_size": "medium"
            },
            "notifications": {
                "workout_reminder": True,
                "water_reminder": True,
                "meal_reminder": True,
                "sleep_reminder": True,
                "weekly_report": True,
                "motivational": True,
                "reminder_time": "08:00"
            },
            "units": {
                "weight": "kg",
                "height": "cm",
                "water": "ml",
                "calories": "kcal"
            },
            "privacy": {
                "share_anonymous_analytics": True,
                "store_ai_conversations": True,
                "personalized_recommendations": True,
                "show_profile_publicly": False
            },
            "two_factor_enabled": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

    async def get_settings(self, user_id: str) -> Dict[str, Any]:
        """Retrieve user settings, creating defaults if not exist, and merging default values for backward compatibility"""
        settings = await self.settings_collection.find_one({"user_id": ObjectId(user_id)})
        
        defaults = self._get_default_settings(user_id)
        if not settings:
            # Create fresh settings
            await self.settings_collection.insert_one(defaults)
            return convert_object_id(defaults)
            
        # Safe merge for nested objects to ensure backward compatibility with older registrations
        updated = False
        
        # 1. Appearance merge
        if "appearance" not in settings:
            settings["appearance"] = defaults["appearance"]
            updated = True
        else:
            for k, v in defaults["appearance"].items():
                if k not in settings["appearance"]:
                    settings["appearance"][k] = v
                    updated = True
                    
        # 2. Notifications merge
        if "notifications" not in settings:
            settings["notifications"] = defaults["notifications"]
            updated = True
        else:
            for k, v in defaults["notifications"].items():
                if k not in settings["notifications"]:
                    settings["notifications"][k] = v
                    updated = True
                    
        # 3. Units merge
        if "units" not in settings:
            settings["units"] = defaults["units"]
            updated = True
        else:
            for k, v in defaults["units"].items():
                if k not in settings["units"]:
                    settings["units"][k] = v
                    updated = True
                    
        # 4. Privacy merge
        if "privacy" not in settings:
            settings["privacy"] = defaults["privacy"]
            updated = True
        else:
            for k, v in defaults["privacy"].items():
                if k not in settings["privacy"]:
                    settings["privacy"][k] = v
                    updated = True
                    
        # 5. Root fields merge
        if "two_factor_enabled" not in settings:
            settings["two_factor_enabled"] = defaults["two_factor_enabled"]
            updated = True
            
        if updated:
            settings["updated_at"] = datetime.utcnow()
            await self.settings_collection.update_one(
                {"_id": settings["_id"]},
                {"$set": {
                    "appearance": settings["appearance"],
                    "notifications": settings["notifications"],
                    "units": settings["units"],
                    "privacy": settings["privacy"],
                    "two_factor_enabled": settings["two_factor_enabled"],
                    "updated_at": settings["updated_at"]
                }}
            )
            
        return convert_object_id(settings)

    async def update_settings(self, user_id: str, settings_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update any subset of settings fields"""
        # Ensure user_id is stripped from incoming data
        settings_data.pop("user_id", None)
        settings_data.pop("_id", None)
        settings_data["updated_at"] = datetime.utcnow()
        
        result = await self.settings_collection.find_one_and_update(
            {"user_id": ObjectId(user_id)},
            {"$set": settings_data},
            return_document=True
        )
        if not result:
            # Fallback create
            defaults = self._get_default_settings(user_id)
            defaults.update(settings_data)
            await self.settings_collection.insert_one(defaults)
            return convert_object_id(defaults)
            
        return convert_object_id(result)

    async def update_theme(self, user_id: str, theme_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update only appearance theme variables"""
        settings = await self.get_settings(user_id)
        appearance = settings.get("appearance", {})
        appearance.update(theme_data)
        
        return await self.update_settings(user_id, {"appearance": appearance})

    async def update_notifications(self, user_id: str, notif_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update only notification toggles"""
        settings = await self.get_settings(user_id)
        notifications = settings.get("notifications", {})
        notifications.update(notif_data)
        
        return await self.update_settings(user_id, {"notifications": notifications})

    async def update_privacy(self, user_id: str, privacy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update privacy variables"""
        settings = await self.get_settings(user_id)
        privacy = settings.get("privacy", {})
        privacy.update(privacy_data)
        
        return await self.update_settings(user_id, {"privacy": privacy})

    async def update_security(self, user_id: str, security_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update security parameters (e.g. 2FA toggle)"""
        update_dict = {}
        if "two_factor_enabled" in security_data:
            update_dict["two_factor_enabled"] = bool(security_data["two_factor_enabled"])
            
        return await self.update_settings(user_id, update_dict)

    async def get_export_data(self, user_id: str) -> Dict[str, Any]:
        """Aggregate all user logs and profile details in an exportable dictionary format"""
        user_oid = ObjectId(user_id)
        
        # 1. Profile details
        profile = await self.db.profiles.find_one({"user_id": user_oid})
        
        # 2. Health tracking logs
        health_logs = []
        async for log in self.db.health_logs.find({"user_id": user_oid}).sort("log_date", -1):
            health_logs.append(log)
            
        # 3. Workouts recommendation history
        workout_history = []
        async for w in self.db.workouts.find({"user_id": user_id}).sort("created_at", -1):
            workout_history.append(w)
            
        # 4. Workout daily plans logs
        workout_plans = []
        async for wp in self.db.workout_plans.find({"user_id": user_oid}).sort("date", -1):
            workout_plans.append(wp)
            
        # 5. Diet recommendations
        diet_recommendations = []
        async for dr in self.db.diet_plans.find({"user_id": user_id}).sort("created_at", -1):
            diet_recommendations.append(dr)
            
        # 6. Diet daily logs
        diet_plans = []
        async for dp in self.db.diet_plans.find({"user_id": user_oid}).sort("date", -1):
            diet_plans.append(dp)
            
        # 7. BMI History logs
        bmi_history = []
        async for bmi in self.db.bmi_history.find({"user_id": user_oid}).sort("created_at", -1):
            bmi_history.append(bmi)
            
        # 8. Calorie History logs
        calorie_history = []
        async for cal in self.db.calorie_history.find({"user_id": user_oid}).sort("created_at", -1):
            calorie_history.append(cal)
            
        # 9. Settings configuration
        settings = await self.settings_collection.find_one({"user_id": user_oid})

        return convert_object_id({
            "export_metadata": {
                "generated_at": datetime.utcnow().isoformat(),
                "user_id": user_id
            },
            "profile": profile,
            "settings": settings,
            "health_logs": health_logs,
            "workouts_recommendations": workout_history,
            "workout_plans": workout_plans,
            "diet_recommendations": diet_recommendations,
            "diet_plans": diet_plans,
            "bmi_history": bmi_history,
            "calorie_history": calorie_history
        })

    async def delete_all_user_data(self, user_id: str) -> bool:
        """Completely purge all database collections associated with this user ID"""
        user_oid = ObjectId(user_id)
        
        # Delete user login document
        user_del = await self.users_collection.delete_one({"_id": user_oid})
        if user_del.deleted_count > 0:
            # Delete everything else
            await self.db.profiles.delete_one({"user_id": user_oid})
            await self.db.health_logs.delete_many({"user_id": user_oid})
            
            # Workout plans and recommendations
            await self.db.workouts.delete_many({"user_id": user_id})
            await self.db.workout_plans.delete_many({"user_id": user_oid})
            
            # Diet plans and recommendations
            await self.db.diet_plans.delete_many({"user_id": user_oid})
            await self.db.diet_plans.delete_many({"user_id": user_id})
            
            # BMI and Calorie history logs
            await self.db.bmi_history.delete_many({"user_id": user_oid})
            await self.db.calorie_history.delete_many({"user_id": user_oid})
            
            # Conversations and legacy chat logs
            await self.db.conversations.delete_many({"user_id": user_oid})
            await self.db.chat_history.delete_many({"user_id": user_oid})
            
            # Settings
            await self.settings_collection.delete_one({"user_id": user_oid})
            return True
            
        return False
