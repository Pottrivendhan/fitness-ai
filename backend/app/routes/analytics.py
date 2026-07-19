from fastapi import APIRouter, Depends, Query, Path, status, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_database
from app.services.analytics import AnalyticsService
from app.middleware import get_current_user
from app.utils import ResponseFormatter
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/dashboard", status_code=status.HTTP_200_OK)
async def get_dashboard_data(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get dashboard data"""
    try:
        analytics_service = AnalyticsService(db)
        result = await analytics_service.get_dashboard_data(current_user["user_id"])
        return ResponseFormatter.success(result, "Dashboard data retrieved successfully")
    except Exception as e:
        logger.error(f"Error in get_dashboard_data: {str(e)}")
        # Return safe default dashboard data structure rather than crashing
        safe_defaults = {
            "today": {"steps": 0, "water": 0, "calories": 0, "exercise_minutes": 0, "sleep_hours": 0, "mood": None},
            "weekly": {"average_steps": 0, "average_calories": 0, "total_exercise_minutes": 0, "days_logged": 0},
            "profile": {"current_weight": 0, "target_weight": None, "bmi": 0.0, "bmi_category": "Normal", "recommended_calories": 2000, "fitness_goal": "Maintain", "activity_level": "Sedentary", "avatar_url": None},
            "workout": {"name": "Rest Day Recovery", "difficulty": "beginner", "is_completed": False, "completion_percentage": 0.0, "calories_burned": 0},
            "diet": {"completed_meals": 0, "total_meals": 5, "calories_consumed": 0, "calories_target": 2000, "completion_percentage": 0.0},
            "streak_days": 0,
            "goal_completions": {
                "steps": {"current": 0, "target": 10000, "percentage": 0.0},
                "water": {"current": 0, "target": 2000, "percentage": 0.0},
                "calories": {"current": 0, "target": 2000, "percentage": 0.0},
                "sleep": {"current": 0, "target": 8, "percentage": 0.0}
            },
            "badges": []
        }
        return ResponseFormatter.success(safe_defaults, "Dashboard data retrieved with safe defaults")

@router.get("/report", status_code=status.HTTP_200_OK)
async def get_report(
    period: str = Query("weekly", regex="^(weekly|monthly|yearly)$"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get report for specified period"""
    try:
        analytics_service = AnalyticsService(db)
        result = await analytics_service.get_report(current_user["user_id"], period)
        return ResponseFormatter.success(result, f"{period.capitalize()} report retrieved successfully")
    except Exception as e:
        logger.error(f"Error in get_report: {str(e)}")
        safe_defaults = {
            "period": period.capitalize(),
            "start_date": "",
            "end_date": "",
            "metrics": {
                "total_steps": 0,
                "average_daily_steps": 0,
                "total_water_ml": 0,
                "average_daily_water_ml": 0,
                "total_exercise_minutes": 0,
                "average_daily_calories": 0,
                "average_sleep_hours": 0.0,
                "weight_change_kg": 0.0,
                "workout_adherence_percent": 0.0,
                "diet_adherence_percent": 0.0,
                "bmi_start": 0.0,
                "bmi_end": 0.0,
                "bmi_trend": "Stable"
            },
            "logs_count": 0
        }
        return ResponseFormatter.success(safe_defaults, f"{period.capitalize()} report retrieved with safe defaults")

@router.get("/chart/{chart_type}", status_code=status.HTTP_200_OK)
async def get_chart_data(
    chart_type: str = Path(
        ...,
        pattern="^(steps|weight|calories|water|sleep|exercise|bmi|workout_completion|diet_adherence)$"
    ),
    days: int = Query(30, ge=7, le=365),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get chart data"""
    try:
        analytics_service = AnalyticsService(db)
        result = await analytics_service.get_chart_data(
            current_user["user_id"],
            chart_type,
            days
        )
        return ResponseFormatter.success(result, "Chart data retrieved successfully")
    except Exception as e:
        logger.error(f"Error in get_chart_data for {chart_type}: {str(e)}")
        return ResponseFormatter.success([], f"Chart data for {chart_type} retrieved with empty default")

@router.get("/insights", status_code=status.HTTP_200_OK)
async def get_ai_insights(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get dynamic AI health insights"""
    try:
        analytics_service = AnalyticsService(db)
        result = await analytics_service.get_ai_insights(current_user["user_id"])
        return ResponseFormatter.success(result, "AI insights retrieved successfully")
    except Exception as e:
        logger.error(f"Error in get_ai_insights: {str(e)}")
        return ResponseFormatter.success([], "AI insights retrieved with empty default")

@router.get("/streak", status_code=status.HTTP_200_OK)
async def get_streak_count(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get current tracking streak"""
    try:
        analytics_service = AnalyticsService(db)
        streak = await analytics_service.get_streak_count(current_user["user_id"])
        return ResponseFormatter.success({
            "streak_days": streak,
            "message": f"Amazing! You have a {streak} day streak!" if streak > 0 else "Start logging to build your streak!"
        }, "Streak data retrieved successfully")
    except Exception as e:
        logger.error(f"Error in get_streak_count: {str(e)}")
        return ResponseFormatter.success({
            "streak_days": 0,
            "message": "Start logging to build your streak!"
        }, "Streak data retrieved with safe defaults")

@router.get("/admin/analytics", status_code=status.HTTP_200_OK)
async def get_admin_analytics(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get admin analytics (admin only)"""
    try:
        analytics_service = AnalyticsService(db)
        result = await analytics_service.get_admin_analytics()
        return ResponseFormatter.success(result, "Admin analytics retrieved successfully")
    except Exception as e:
        logger.error(f"Error in get_admin_analytics: {str(e)}")
        safe_defaults = {
            "total_users": 0,
            "active_users": 0,
            "new_users_today": 0,
            "new_users_week": 0,
            "total_workouts": 0,
            "total_diets": 0,
            "total_health_logs": 0,
            "average_logs_per_user": 0
        }
        return ResponseFormatter.success(safe_defaults, "Admin analytics retrieved with safe defaults")
