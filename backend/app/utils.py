from datetime import datetime
from typing import Dict, Any, List, Optional
import uuid
from bson import ObjectId

class ResponseFormatter:
    """Format API responses"""
    
    @staticmethod
    def success(data: Any = None, message: str = "Success", status_code: int = 200) -> Dict[str, Any]:
        """Format successful response"""
        return {
            "status": "success",
            "code": status_code,
            "message": message,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def error(message: str, status_code: int = 400, details: Any = None) -> Dict[str, Any]:
        """Format error response"""
        return {
            "status": "error",
            "code": status_code,
            "message": message,
            "details": details,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def paginated(data: List[Any], total: int, page: int, per_page: int) -> Dict[str, Any]:
        """Format paginated response"""
        total_pages = (total + per_page - 1) // per_page
        return {
            "status": "success",
            "data": data,
            "pagination": {
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            },
            "timestamp": datetime.utcnow().isoformat()
        }

def generate_id() -> str:
    """Generate unique ID"""
    return str(uuid.uuid4())

def get_object_id() -> ObjectId:
    """Generate MongoDB ObjectId"""
    return ObjectId()

def convert_object_id(obj: Any) -> Any:
    """Convert ObjectId to string in dictionaries"""
    if isinstance(obj, dict):
        res = {key: convert_object_id(value) for key, value in obj.items()}
        if "_id" in res and "id" not in res:
            res["id"] = res["_id"]
        return res
    elif isinstance(obj, list):
        return [convert_object_id(item) for item in obj]
    elif isinstance(obj, ObjectId):
        return str(obj)
    return obj

class HealthCalculations:
    """Health calculation utilities"""
    
    @staticmethod
    def calculate_bmi(weight_kg: float, height_cm: float) -> Dict[str, Any]:
        """Calculate BMI"""
        height_m = height_cm / 100
        bmi = weight_kg / (height_m ** 2)
        
        if bmi < 18.5:
            category = "Underweight"
            ideal_weight_min = 18.5 * (height_m ** 2)
            ideal_weight_max = 24.9 * (height_m ** 2)
        elif bmi < 25:
            category = "Normal Weight"
            ideal_weight_min = 18.5 * (height_m ** 2)
            ideal_weight_max = 24.9 * (height_m ** 2)
        elif bmi < 30:
            category = "Overweight"
            ideal_weight_min = 18.5 * (height_m ** 2)
            ideal_weight_max = 24.9 * (height_m ** 2)
        else:
            category = "Obese"
            ideal_weight_min = 18.5 * (height_m ** 2)
            ideal_weight_max = 24.9 * (height_m ** 2)
        
        recommendation = f"Your BMI is {bmi:.1f} ({category}). Target range: {ideal_weight_min:.1f}-{ideal_weight_max:.1f} kg"
        
        return {
            "bmi": round(bmi, 1),
            "category": category,
            "ideal_weight_min": round(ideal_weight_min, 1),
            "ideal_weight_max": round(ideal_weight_max, 1),
            "recommendation": recommendation
        }
    
    @staticmethod
    def calculate_bmr(age: int, weight_kg: float, height_cm: float, gender: str) -> float:
        """Calculate Basal Metabolic Rate using Mifflin-St Jeor formula"""
        if gender.lower() == "male":
            bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5
        else:
            bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161
        
        return round(bmr, 1)
    
    @staticmethod
    def calculate_tdee(bmr: float, activity_level: str) -> float:
        """Calculate Total Daily Energy Expenditure"""
        activity_multipliers = {
            "sedentary": 1.2,
            "lightly_active": 1.375,
            "moderately_active": 1.55,
            "very_active": 1.725,
            "extremely_active": 1.9
        }
        
        multiplier = activity_multipliers.get(activity_level, 1.55)
        tdee = bmr * multiplier
        
        return round(tdee, 1)
    
    @staticmethod
    def calculate_macros(daily_calories: float, goal: str) -> Dict[str, float]:
        """Calculate macronutrient distribution"""
        if goal == "weight_loss":
            protein_percent = 0.40
            carbs_percent = 0.35
            fat_percent = 0.25
        elif goal == "muscle_building":
            protein_percent = 0.35
            carbs_percent = 0.45
            fat_percent = 0.20
        else:
            protein_percent = 0.30
            carbs_percent = 0.50
            fat_percent = 0.20
        
        return {
            "protein_grams": round((daily_calories * protein_percent) / 4, 1),
            "carbs_grams": round((daily_calories * carbs_percent) / 4, 1),
            "fat_grams": round((daily_calories * fat_percent) / 9, 1),
            "protein_percent": protein_percent * 100,
            "carbs_percent": carbs_percent * 100,
            "fat_percent": fat_percent * 100
        }
    
    @staticmethod
    def calculate_water_intake(weight_kg: float) -> int:
        """Calculate daily water intake in ml"""
        return round(weight_kg * 35)  # 35ml per kg

class StringUtils:
    """String utility functions"""
    
    @staticmethod
    def slugify(text: str) -> str:
        """Convert text to slug"""
        return text.lower().replace(" ", "-").replace("_", "-")
    
    @staticmethod
    def truncate(text: str, length: int) -> str:
        """Truncate text to length"""
        if len(text) > length:
            return text[:length - 3] + "..."
        return text

class PaginationUtils:
    """Pagination utility functions"""
    
    @staticmethod
    def get_skip_limit(page: int, per_page: int) -> tuple:
        """Get skip and limit for database queries"""
        if page < 1:
            page = 1
        if per_page < 1:
            per_page = 10
        if per_page > 100:
            per_page = 100
        
        skip = (page - 1) * per_page
        return skip, per_page
    
    @staticmethod
    def validate_pagination(page: int = 1, per_page: int = 10) -> tuple:
        """Validate and return safe pagination values"""
        page = max(1, page)
        per_page = max(1, min(per_page, 100))
        return page, per_page

class DateTimeUtils:
    """DateTime utility functions"""
    
    @staticmethod
    def get_today_start() -> datetime:
        """Get start of today (00:00:00)"""
        now = datetime.utcnow()
        return now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    @staticmethod
    def get_today_end() -> datetime:
        """Get end of today (23:59:59)"""
        now = datetime.utcnow()
        return now.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    @staticmethod
    def get_week_start() -> datetime:
        """Get start of week (Monday 00:00:00)"""
        now = datetime.utcnow()
        return (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    
    @staticmethod
    def get_month_start() -> datetime:
        """Get start of month (1st 00:00:00)"""
        now = datetime.utcnow()
        return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
