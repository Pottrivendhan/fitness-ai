from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

# Enums
class GenderEnum(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"

class ActivityLevelEnum(str, Enum):
    SEDENTARY = "sedentary"
    LIGHTLY_ACTIVE = "lightly_active"
    MODERATELY_ACTIVE = "moderately_active"
    VERY_ACTIVE = "very_active"
    EXTREMELY_ACTIVE = "extremely_active"

class FitnessGoalEnum(str, Enum):
    WEIGHT_LOSS = "weight_loss"
    WEIGHT_GAIN = "weight_gain"
    MAINTAIN = "maintain"
    MUSCLE_BUILDING = "muscle_building"
    IMPROVE_ENDURANCE = "improve_endurance"
    GENERAL_FITNESS = "general_fitness"

class WorkoutTypeEnum(str, Enum):
    CARDIO = "cardio"
    STRENGTH = "strength"
    YOGA = "yoga"
    HIIT = "hiit"
    STRETCHING = "stretching"

class DifficultyEnum(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"

class WorkoutLocationEnum(str, Enum):
    HOME = "home"
    GYM = "gym"
    OUTDOOR = "outdoor"

class MealTypeEnum(str, Enum):
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"

class DietTypeEnum(str, Enum):
    VEG = "vegetarian"
    NON_VEG = "non_vegetarian"
    VEGAN = "vegan"

class UserRoleEnum(str, Enum):
    USER = "user"
    ADMIN = "admin"

# Authentication Schemas
class UserRegisterSchema(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    name: str = Field(..., min_length=2, description="Name must be at least 2 characters")
    confirm_password: str

class UserLoginSchema(BaseModel):
    email: EmailStr
    password: str

class TokenSchema(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenRefreshSchema(BaseModel):
    refresh_token: str

class PasswordResetRequestSchema(BaseModel):
    email: EmailStr

class PasswordResetSchema(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str

# User Profile Schemas
class UserProfileCreateSchema(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    age: int = Field(..., ge=13, le=120)
    gender: str = Field(..., description="Gender (e.g. Male, Female, Other)")
    height: float = Field(..., gt=0, description="Height in cm")
    weight: float = Field(..., gt=0, description="Weight in kg")
    blood_group: str = Field(..., pattern="^(A|B|AB|O)[+-]$", description="Blood group (e.g. A+, O-, AB+)")
    medical_conditions: List[str] = Field(default=[])
    goal: str = Field(..., pattern="^(Weight Loss|Weight Gain|Muscle Gain|Maintain)$", description="Fitness Goal")
    activity_level: str = Field(..., pattern="^(Sedentary|Light|Moderate|Active)$", description="Activity Level")
    
    # Future-proof / AI goals
    daily_step_goal: int = Field(default=10000, gt=0)
    daily_water_goal: int = Field(default=2000, gt=0)
    daily_calorie_goal: int = Field(default=2000, gt=0)
    sleep_goal: int = Field(default=8, ge=4, le=12)
    target_weight: Optional[float] = Field(None, gt=0)

class UserProfileUpdateSchema(BaseModel):
    name: Optional[str] = Field(None, min_length=2)
    age: Optional[int] = Field(None, ge=13, le=120)
    gender: Optional[str] = None
    height: Optional[float] = Field(None, gt=0)
    weight: Optional[float] = Field(None, gt=0)
    blood_group: Optional[str] = Field(None, pattern="^(A|B|AB|O)[+-]$")
    medical_conditions: Optional[List[str]] = None
    goal: Optional[str] = Field(None, pattern="^(Weight Loss|Weight Gain|Muscle Gain|Maintain)$")
    activity_level: Optional[str] = Field(None, pattern="^(Sedentary|Light|Moderate|Active)$")
    
    # Future-proof / AI goals
    daily_step_goal: Optional[int] = Field(None, gt=0)
    daily_water_goal: Optional[int] = Field(None, gt=0)
    daily_calorie_goal: Optional[int] = Field(None, gt=0)
    sleep_goal: Optional[int] = Field(None, ge=4, le=12)
    target_weight: Optional[float] = Field(None, gt=0)

class UserProfileResponseSchema(BaseModel):
    user_id: str
    name: str
    email: EmailStr
    age: int
    gender: str
    height: float
    weight: float
    blood_group: str
    medical_conditions: List[str]
    goal: str
    activity_level: str
    bmi: float
    daily_step_goal: int
    daily_water_goal: int
    daily_calorie_goal: int
    sleep_goal: int
    target_weight: Optional[float] = None
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class UserResponseSchema(BaseModel):
    id: str
    email: str
    name: str
    role: UserRoleEnum
    profile: Optional[UserProfileResponseSchema] = None
    created_at: datetime
    updated_at: datetime

# Health Calculation Schemas
class BMICalculationSchema(BaseModel):
    weight: float = Field(..., gt=0, description="Weight in kg")
    height: float = Field(..., gt=0, description="Height in cm")

class BMIResponseSchema(BaseModel):
    bmi: float
    category: str
    ideal_weight_min: float
    ideal_weight_max: float
    recommendation: str

class BMIHistoryResponseSchema(BaseModel):
    id: str
    user_id: str
    weight: float
    height: float
    bmi: float
    category: str
    ideal_weight_min: float
    ideal_weight_max: float
    recommendation: str
    created_at: datetime


class CalorieCalculationSchema(BaseModel):
    age: int = Field(..., ge=13, le=120)
    gender: GenderEnum
    weight: float = Field(..., gt=0, description="Weight in kg")
    height: float = Field(..., gt=0, description="Height in cm")
    activity_level: ActivityLevelEnum

class CalorieResponseSchema(BaseModel):
    bmr: float
    tdee: float
    daily_calories: float
    macros: dict
    recommendation: str

class MacroBreakdownSchema(BaseModel):
    protein_grams: float
    carbs_grams: float
    fat_grams: float
    protein_percent: float
    carbs_percent: float
    fat_percent: float

class CalorieHistoryResponseSchema(BaseModel):
    id: str
    user_id: str
    age: int
    gender: str
    weight: float
    height: float
    activity_level: str
    bmr: float
    tdee: float
    maintenance_calories: float
    weight_loss_calories: float
    weight_gain_calories: float
    maintenance_macros: MacroBreakdownSchema
    weight_loss_macros: MacroBreakdownSchema
    weight_gain_macros: MacroBreakdownSchema
    water_intake_ml: float
    created_at: datetime

# Workout Schemas
class ExerciseSchema(BaseModel):
    name: str
    sets: int
    reps: int
    duration_seconds: Optional[int] = None
    calories_burned: int
    description: str
    form_tips: List[str]

class WorkoutPlanSchema(BaseModel):
    day: str
    workout_type: WorkoutTypeEnum
    location: WorkoutLocationEnum
    duration_minutes: int
    difficulty: DifficultyEnum
    exercises: List[ExerciseSchema]
    rest_days: bool

class WorkoutRecommendationSchema(BaseModel):
    user_id: str
    fitness_goal: FitnessGoalEnum
    activity_level: ActivityLevelEnum
    equipment_available: List[str] = []
    duration_minutes: int = 60
    difficulty: DifficultyEnum

class WorkoutRecommendationResponseSchema(BaseModel):
    recommendation_id: str
    weekly_schedule: List[WorkoutPlanSchema]
    total_calories_per_week: int
    rest_days: List[str]
    progression_plan: str
    created_at: datetime

# Diet Schemas
class MealSchema(BaseModel):
    name: str
    portion_size: str
    calories: int
    macros: dict
    ingredients: List[str]
    preparation_time: int
    recipe: str

class DietPlanSchema(BaseModel):
    day: str
    breakfast: MealSchema
    lunch: MealSchema
    dinner: MealSchema
    snacks: List[MealSchema]
    daily_calories: int
    daily_macros: dict

class DietRecommendationSchema(BaseModel):
    user_id: str
    fitness_goal: FitnessGoalEnum
    diet_type: DietTypeEnum
    medical_conditions: Optional[List[str]] = []
    duration_days: int = 7

class DietRecommendationResponseSchema(BaseModel):
    recommendation_id: str
    weekly_plan: List[DietPlanSchema]
    total_calories_per_week: int
    macros_summary: dict
    shopping_list: List[str]
    tips: List[str]
    created_at: datetime

class MealItemSchema(BaseModel):
    name: str
    calories: float
    protein: float
    carbs: float
    fat: float
    is_completed: bool = False

class DailyDietPlanResponseSchema(BaseModel):
    id: str
    user_id: str
    date: str
    calories_target: float
    protein_target: float
    carbs_target: float
    fat_target: float
    water_target: float
    meals: Dict[str, MealItemSchema]
    created_at: datetime
    updated_at: datetime

class FoodItemSchema(BaseModel):
    id: str
    name: str
    calories: float
    protein: float
    carbs: float
    fat: float
    serving_size: str

# Health Tracking Schemas
class HealthLogCreateSchema(BaseModel):
    log_date: datetime
    steps: Optional[int] = Field(None, ge=0)
    water_intake: Optional[int] = Field(None, ge=0, description="ml")
    calories_consumed: Optional[int] = Field(None, ge=0)
    exercise_duration: Optional[int] = Field(None, ge=0, description="minutes")
    sleep_hours: Optional[float] = Field(None, ge=0, le=24)
    weight: Optional[float] = Field(None, gt=0)
    mood: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None

class HealthLogResponseSchema(HealthLogCreateSchema):
    log_id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

# Analytics Schemas
class DashboardDataSchema(BaseModel):
    today_steps: int
    today_water: int
    today_calories: int
    today_sleep: float
    weekly_average_steps: int
    weekly_average_calories: int
    weekly_exercise_minutes: int
    current_weight: float
    current_bmi: float
    goal_progress: float
    streak_days: int

class ChartDataPointSchema(BaseModel):
    date: str
    value: float
    label: Optional[str] = None

class ReportSchema(BaseModel):
    period: str
    start_date: datetime
    end_date: datetime
    total_steps: int
    average_daily_steps: int
    total_water: int
    average_daily_water: int
    total_exercise_minutes: int
    average_sleep: float
    weight_change: float
    calories_average: int
    bmi_trend: str

# Chat Schemas
class ChatAttachmentSchema(BaseModel):
    file_id: str = Field(..., description="Unique file ID")
    filename: str = Field(..., description="Original file name")
    type: str = Field(..., description="MIME file type")
    size: int = Field(..., description="File size in bytes")

class ChatRequestSchema(BaseModel):
    message: str = Field("", description="Message content")
    conversation_id: Optional[str] = Field(None, description="Optional conversation ID")
    attachments: Optional[List[ChatAttachmentSchema]] = Field(default=None, description="Uploaded file attachments")

class ChatMessageSchema(BaseModel):
    user_id: str
    message: str
    timestamp: Optional[datetime] = None

class ChatResponseSchema(BaseModel):
    message_id: str
    user_message: str
    assistant_response: str
    timestamp: datetime

class ChatHistorySchema(BaseModel):
    user_id: str
    messages: List[ChatResponseSchema]
    created_at: datetime

# Admin Schemas
class AdminUserListSchema(BaseModel):
    total: int
    page: int
    per_page: int
    users: List[UserResponseSchema]

class AdminAnalyticsSchema(BaseModel):
    total_users: int
    active_users: int
    new_users_today: int
    new_users_week: int
    total_workouts_completed: int
    total_meals_logged: int
    total_health_logs: int
    average_user_streak: float

# Workout Plan Schemas
class ExercisePlanSchema(BaseModel):
    name: str
    sets: int = Field(..., ge=1)
    reps: int = Field(..., ge=0)
    rest_seconds: Optional[int] = Field(30, ge=0)
    duration_seconds: Optional[int] = Field(0, ge=0)
    calories_burned: int = Field(..., ge=0)
    description: str
    form_tips: List[str] = []
    is_completed: bool = False

class WorkoutPlanCreateSchema(BaseModel):
    name: str
    difficulty: str = Field("intermediate", pattern="^(beginner|intermediate|advanced)$")
    duration_minutes: int = Field(..., ge=1)
    calories_burned: int = Field(..., ge=0)
    exercises: List[ExercisePlanSchema] = []
    date: str

class WorkoutPlanUpdateSchema(BaseModel):
    name: Optional[str] = None
    difficulty: Optional[str] = None
    duration_minutes: Optional[int] = None
    calories_burned: Optional[int] = None
    exercises: Optional[List[ExercisePlanSchema]] = None
    date: Optional[str] = None

class WorkoutPlanResponseSchema(BaseModel):
    plan_id: str
    user_id: str
    name: str
    difficulty: str
    duration_minutes: int
    calories_burned: int
    exercises: List[ExercisePlanSchema]
    is_completed: bool
    completed_at: Optional[datetime] = None
    date: str
    created_at: datetime
    updated_at: datetime

class ChangePasswordSchema(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str

class ConversationRenameSchema(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)

class MessageReactionSchema(BaseModel):
    reaction_type: str = Field(..., pattern="^(like|dislike)$")
    status: bool

class AppearanceSettingsUpdateSchema(BaseModel):
    theme: Optional[str] = None
    accent_color: Optional[str] = None
    font_size: Optional[str] = None

class NotificationSettingsUpdateSchema(BaseModel):
    workout_reminder: Optional[bool] = None
    water_reminder: Optional[bool] = None
    meal_reminder: Optional[bool] = None
    sleep_reminder: Optional[bool] = None
    weekly_report: Optional[bool] = None
    motivational: Optional[bool] = None
    reminder_time: Optional[str] = None

class PrivacySettingsUpdateSchema(BaseModel):
    share_anonymous_analytics: Optional[bool] = None
    store_ai_conversations: Optional[bool] = None
    personalized_recommendations: Optional[bool] = None
    show_profile_publicly: Optional[bool] = None

class SecuritySettingsUpdateSchema(BaseModel):
    two_factor_enabled: Optional[bool] = None

class SettingsUpdateSchema(BaseModel):
    appearance: Optional[AppearanceSettingsUpdateSchema] = None
    notifications: Optional[NotificationSettingsUpdateSchema] = None
    units: Optional[Dict[str, str]] = None
    privacy: Optional[PrivacySettingsUpdateSchema] = None
    two_factor_enabled: Optional[bool] = None

class UserInfoUpdateSchema(BaseModel):
    name: Optional[str] = Field(None, min_length=2)
    avatar_url: Optional[str] = None
