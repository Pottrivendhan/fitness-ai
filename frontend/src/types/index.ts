export interface User {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface UserProfile {
  user_id: string
  name: string
  email: string
  age: number
  gender: string
  height: number
  weight: number
  blood_group: string
  medical_conditions: string[]
  goal: 'Weight Loss' | 'Weight Gain' | 'Muscle Gain' | 'Maintain'
  activity_level: 'Sedentary' | 'Light' | 'Moderate' | 'Active'
  bmi: number
  daily_step_goal: number
  daily_water_goal: number
  daily_calorie_goal: number
  sleep_goal: number
  target_weight?: number
  avatar_url?: string
  
  // Compatibility fields
  fitness_goal?: 'weight_loss' | 'weight_gain' | 'maintain' | 'muscle_building' | 'improve_endurance' | 'general_fitness'
  diet_type?: 'vegetarian' | 'non_vegetarian' | 'vegan'
  water_intake_goal?: number
  
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  user: User
  tokens: {
    access_token: string
    refresh_token: string
    token_type: string
  }
}

export interface BMIResult {
  bmi: number
  category: string
  ideal_weight_min: number
  ideal_weight_max: number
  recommendation: string
}

export interface BMIHistoryItem {
  id: string
  user_id: string
  weight: number
  height: number
  bmi: number
  category: string
  ideal_weight_min: number
  ideal_weight_max: number
  recommendation: string
  created_at: string
}

export interface MacroBreakdown {
  protein_grams: number
  carbs_grams: number
  fat_grams: number
  protein_percent: number
  carbs_percent: number
  fat_percent: number
}

export interface CalorieResult {
  bmr: number
  tdee: number
  daily_calories: number
  macros: MacroBreakdown
  recommendation: string
}

export interface CalorieHistoryItem {
  id: string
  user_id: string
  age: number
  gender: string
  weight: number
  height: number
  activity_level: string
  bmr: number
  tdee: number
  maintenance_calories: number
  weight_loss_calories: number
  weight_gain_calories: number
  maintenance_macros: MacroBreakdown
  weight_loss_macros: MacroBreakdown
  weight_gain_macros: MacroBreakdown
  water_intake_ml: number
  created_at: string
}

export interface Exercise {
  name: string
  sets: number
  reps: number
  duration_seconds?: number
  calories_burned: number
  description: string
  form_tips: string[]
  rest_seconds?: number
  is_completed?: boolean
}

export interface WorkoutPlan {
  day: string
  workout_type: 'cardio' | 'strength' | 'yoga' | 'hiit' | 'stretching'
  location: 'home' | 'gym' | 'outdoor'
  duration_minutes: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  exercises: Exercise[]
  rest_days: boolean
}

export interface WorkoutRecommendation {
  recommendation_id: string
  user_id: string
  weekly_schedule: WorkoutPlan[]
  total_calories_per_week: number
  rest_days: string[]
  progression_plan: string
  confidence?: number
  created_at: string
}

export interface Meal {
  name: string
  portion_size: string
  calories: number
  macros: {
    protein: number
    carbs: number
    fat: number
  }
  ingredients: string[]
  preparation_time: number
  recipe: string
}

export interface DietPlan {
  day: string
  breakfast: Meal
  lunch: Meal
  dinner: Meal
  snacks: Meal[]
  daily_calories: number
  daily_macros: {
    protein: number
    carbs: number
    fat: number
  }
}

export interface DietRecommendation {
  recommendation_id: string
  user_id: string
  weekly_plan: DietPlan[]
  total_calories_per_week: number
  macros_summary: {
    protein: number
    carbs: number
    fat: number
  }
  shopping_list: string[]
  tips: string[]
  confidence?: number
  created_at: string
}

export interface HealthLog {
  log_id: string
  user_id: string
  log_date: string
  steps?: number
  water_intake?: number
  calories_consumed?: number
  exercise_duration?: number
  sleep_hours?: number
  weight?: number
  mood?: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface DashboardData {
  today: {
    steps: number
    water: number
    calories: number
    exercise_minutes: number
    sleep_hours: number
    mood?: number
  }
  weekly: {
    average_steps: number
    average_calories: number
    total_exercise_minutes: number
    days_logged: number
  }
  profile: {
    current_weight: number
    target_weight?: number
    bmi: number
    bmi_category?: string
    recommended_calories?: number
    fitness_goal: string
    activity_level?: string
    avatar_url?: string
  }
  workout: {
    name: string
    difficulty: string
    is_completed: boolean
    completion_percentage: number
    calories_burned: number
  }
  diet: {
    completed_meals: number
    total_meals: number
    calories_consumed: number
    calories_target: number
    completion_percentage: number
  }
}

export interface MealItem {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  is_completed: boolean
}

export interface DailyDietPlan {
  id: string
  user_id: string
  date: string
  calories_target: number
  protein_target: number
  carbs_target: number
  fat_target: number
  water_target: number
  meals: {
    breakfast: MealItem
    morning_snack: MealItem
    lunch: MealItem
    evening_snack: MealItem
    dinner: MealItem
  }
  created_at: string
  updated_at: string
}

export interface FoodItem {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  serving_size: string
}

export interface WorkoutPlanLog {
  plan_id: string
  user_id: string
  name: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  duration_minutes: number
  calories_burned: number
  exercises: Exercise[]
  is_completed: boolean
  completed_at?: string
  date: string
  created_at: string
  updated_at: string
}

export interface Report {
  period: string
  start_date: string
  end_date: string
  metrics: {
    total_steps: number
    average_daily_steps: number
    total_water_ml: number
    average_daily_water_ml: number
    total_exercise_minutes: number
    average_daily_calories: number
    average_sleep_hours: number
    weight_change_kg: number
  }
  logs_count: number
}

export interface ChartDataPoint {
  date: string
  value: number
  label?: string
}

export interface ChatMessage {
  user_message: string
  assistant_response: string
  timestamp: string
}

export interface Tokens {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface ApiResponse<T> {
  status: 'success' | 'error'
  code: number
  message: string
  data?: T
  details?: any
  timestamp: string
}

export interface PaginatedResponse<T> {
  status: 'success'
  data: T[]
  pagination: {
    total: number
    page: number
    per_page: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
  timestamp: string
}
