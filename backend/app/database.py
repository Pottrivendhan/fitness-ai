from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.config import settings

class Database:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

db = Database()

async def connect_to_mongo():
    """Connect to MongoDB"""
    db.client = AsyncIOMotorClient(settings.DATABASE_URL)
    db.db = db.client[settings.MONGO_DB_NAME]
    
    # Create indexes
    try:
        # Users collection indexes
        await db.db.users.create_index("email", unique=True)
        await db.db.users.create_index("created_at")
        
        # Profiles collection indexes
        await db.db.profiles.create_index("user_id", unique=True)
        
        # Health logs indexes
        await db.db.health_logs.create_index([("user_id", 1), ("log_date", -1)])
        
        # Workouts indexes
        await db.db.workouts.create_index("user_id")
        await db.db.workouts.create_index("created_at")
        
        # Diet plans indexes
        await db.db.diet_plans.create_index("user_id")
        await db.db.diet_plans.create_index("created_at")
        
        # Chat history indexes
        await db.db.chat_history.create_index([("user_id", 1), ("created_at", -1)])
        
        # BMI history indexes
        await db.db.bmi_history.create_index([("user_id", 1), ("created_at", -1)])
        
        # Calorie history indexes
        await db.db.calorie_history.create_index([("user_id", 1), ("created_at", -1)])
        
        # Diet plans index
        await db.db.diet_plans.create_index([("user_id", 1), ("date", -1)])
        
        # Foods index
        await db.db.foods.create_index("name")
        
        print("✓ Connected to MongoDB and created indexes")
    except Exception as e:
        print(f"✗ Error connecting to MongoDB: {e}")

async def close_mongo_connection():
    """Close MongoDB connection"""
    if db.client is not None:
        db.client.close()
        print("✓ Closed MongoDB connection")

async def get_database() -> AsyncIOMotorDatabase:
    """Get database instance"""
    return db.db

# Database Collections Structure

# Users Collection:
# {
#   "_id": ObjectId,
#   "email": "user@example.com",
#   "name": "John Doe",
#   "password_hash": "hashed_password",
#   "role": "user",
#   "is_active": True,
#   "email_verified": True,
#   "avatar_url": "url_to_avatar",
#   "created_at": datetime,
#   "updated_at": datetime,
#   "last_login": datetime
# }

# Profiles Collection:
# {
#   "_id": ObjectId,
#   "user_id": ObjectId,
#   "age": 30,
#   "gender": "male",
#   "height": 175,  # cm
#   "weight": 70,   # kg
#   "activity_level": "moderately_active",
#   "fitness_goal": "weight_loss",
#   "medical_conditions": ["diabetes"],
#   "diet_type": "non_vegetarian",
#   "water_intake_goal": 2000,  # ml
#   "sleep_goal": 8,  # hours
#   "target_weight": 65,  # kg
#   "created_at": datetime,
#   "updated_at": datetime
# }

# Health Logs Collection:
# {
#   "_id": ObjectId,
#   "user_id": ObjectId,
#   "log_date": datetime,
#   "steps": 8000,
#   "water_intake": 1500,  # ml
#   "calories_consumed": 2100,
#   "exercise_duration": 45,  # minutes
#   "sleep_hours": 7.5,
#   "weight": 70,
#   "mood": 4,  # 1-5 scale
#   "notes": "Felt good today",
#   "created_at": datetime,
#   "updated_at": datetime
# }

# Workouts Collection:
# {
#   "_id": ObjectId,
#   "user_id": ObjectId,
#   "recommendation_id": ObjectId,
#   "weekly_schedule": [
#     {
#       "day": "Monday",
#       "workout_type": "cardio",
#       "location": "gym",
#       "duration_minutes": 45,
#       "difficulty": "intermediate",
#       "exercises": [
#         {
#           "name": "Running",
#           "sets": 1,
#           "reps": 0,
#           "duration_seconds": 1800,
#           "calories_burned": 300,
#           "description": "30 min run",
#           "form_tips": ["Keep posture straight"]
#         }
#       ],
#       "rest_days": False
#     }
#   ],
#   "total_calories_per_week": 2100,
#   "rest_days": ["Wednesday", "Sunday"],
#   "progression_plan": "Increase speed by 0.5 km/h each week",
#   "completed": False,
#   "created_at": datetime,
#   "updated_at": datetime
# }

# Diet Plans Collection:
# {
#   "_id": ObjectId,
#   "user_id": ObjectId,
#   "recommendation_id": ObjectId,
#   "weekly_plan": [
#     {
#       "day": "Monday",
#       "breakfast": {
#         "name": "Oatmeal with Fruits",
#         "portion_size": "1 bowl",
#         "calories": 350,
#         "macros": {"protein": 10, "carbs": 60, "fat": 5},
#         "ingredients": ["oats", "banana", "berries"],
#         "preparation_time": 10,
#         "recipe": "Cook oats..."
#       },
#       "lunch": { ... },
#       "dinner": { ... },
#       "snacks": [ ... ],
#       "daily_calories": 2100,
#       "daily_macros": {"protein": 70, "carbs": 260, "fat": 50}
#     }
#   ],
#   "total_calories_per_week": 14700,
#   "macros_summary": { ... },
#   "shopping_list": ["chicken", "broccoli", "rice"],
#   "tips": ["Meal prep on Sunday"],
#   "created_at": datetime,
#   "updated_at": datetime
# }

# Chat History Collection:
# {
#   "_id": ObjectId,
#   "user_id": ObjectId,
#   "messages": [
#     {
#       "user_message": "What's a good workout?",
#       "assistant_response": "Based on your profile...",
#       "timestamp": datetime
#     }
#   ],
#   "created_at": datetime,
#   "updated_at": datetime
# }

# Reports Collection:
# {
#   "_id": ObjectId,
#   "user_id": ObjectId,
#   "period": "weekly",
#   "start_date": datetime,
#   "end_date": datetime,
#   "total_steps": 50000,
#   "average_daily_steps": 7142,
#   "total_water": 14000,
#   "average_daily_water": 2000,
#   "total_exercise_minutes": 300,
#   "average_sleep": 7.5,
#   "weight_change": -2.5,
#   "calories_average": 2100,
#   "bmi_trend": "decreasing",
#   "created_at": datetime
# }

# Settings Collection:
# {
#   "_id": ObjectId,
#   "user_id": ObjectId,
#   "dark_mode": True,
#   "notifications_enabled": True,
#   "email_reminders": False,
#   "language": "en",
#   "timezone": "UTC",
#   "created_at": datetime,
#   "updated_at": datetime
# }
