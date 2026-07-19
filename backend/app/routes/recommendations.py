from fastapi import APIRouter, HTTPException, status, Depends, Body, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_database
from app.services.recommendation import RecommendationService
from app.middleware import get_current_user
from app.utils import ResponseFormatter
from typing import Dict, Any, Optional

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@router.post("/workout", status_code=status.HTTP_201_CREATED)
async def get_workout_recommendation(
    preferences: Optional[Dict[str, Any]] = Body(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get personalized workout recommendation"""
    recommendation_service = RecommendationService(db)
    result = await recommendation_service.recommend_workout(
        current_user["user_id"],
        preferences
    )
    
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return ResponseFormatter.success(result, "Workout recommendation generated successfully", 201)

@router.post("/diet", status_code=status.HTTP_201_CREATED)
async def get_diet_recommendation(
    preferences: Optional[Dict[str, Any]] = Body(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get personalized diet recommendation"""
    recommendation_service = RecommendationService(db)
    result = await recommendation_service.recommend_diet(
        current_user["user_id"],
        preferences
    )
    
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    
    return ResponseFormatter.success(result, "Diet recommendation generated successfully", 201)

@router.get("/workout/{recommendation_id}", status_code=status.HTTP_200_OK)
async def get_workout_recommendation_details(
    recommendation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get specific workout recommendation"""
    recommendation_service = RecommendationService(db)
    result = await recommendation_service.get_workout_recommendation(recommendation_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found"
        )
    
    return ResponseFormatter.success(result, "Recommendation retrieved successfully")

@router.get("/diet/{recommendation_id}", status_code=status.HTTP_200_OK)
async def get_diet_recommendation_details(
    recommendation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get specific diet recommendation"""
    recommendation_service = RecommendationService(db)
    result = await recommendation_service.get_diet_recommendation(recommendation_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found"
        )
    
    return ResponseFormatter.success(result, "Recommendation retrieved successfully")

@router.get("/workout/history", status_code=status.HTTP_200_OK)
async def get_workout_history(
    limit: int = Query(5, ge=1, le=50),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get user's workout recommendation history"""
    recommendation_service = RecommendationService(db)
    result = await recommendation_service.get_user_workout_recommendations(
        current_user["user_id"],
        limit
    )
    return ResponseFormatter.success(result, "Workout history retrieved successfully")

@router.get("/diet/history", status_code=status.HTTP_200_OK)
async def get_diet_history(
    limit: int = Query(5, ge=1, le=50),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get user's diet recommendation history"""
    recommendation_service = RecommendationService(db)
    result = await recommendation_service.get_user_diet_recommendations(
        current_user["user_id"],
        limit
    )
    return ResponseFormatter.success(result, "Diet history retrieved successfully")

@router.get("/latest", status_code=status.HTTP_200_OK)
async def get_latest_recommendations(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get latest workout and diet recommendations"""
    recommendation_service = RecommendationService(db)
    result = await recommendation_service.get_latest_recommendations(current_user["user_id"])
    return ResponseFormatter.success(result, "Latest recommendations retrieved successfully")

@router.delete("/workout/{recommendation_id}", status_code=status.HTTP_200_OK)
async def delete_workout_recommendation(
    recommendation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Delete workout recommendation"""
    recommendation_service = RecommendationService(db)
    success = await recommendation_service.delete_workout_recommendation(
        current_user["user_id"],
        recommendation_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found"
        )
    
    return ResponseFormatter.success(None, "Recommendation deleted successfully")

@router.delete("/diet/{recommendation_id}", status_code=status.HTTP_200_OK)
async def delete_diet_recommendation(
    recommendation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Delete diet recommendation"""
    recommendation_service = RecommendationService(db)
    success = await recommendation_service.delete_diet_recommendation(
        current_user["user_id"],
        recommendation_id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found"
        )
    
    return ResponseFormatter.success(None, "Recommendation deleted successfully")

@router.get("/history", status_code=status.HTTP_200_OK)
async def get_recommendation_history(
    type: str = Query("both", regex="^(workout|diet|both)$"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get recommendation history (workouts, diets, or both)"""
    recommendation_service = RecommendationService(db)
    result = await recommendation_service.get_recommendation_history(
        current_user["user_id"],
        type
    )
    return ResponseFormatter.success(result, "Recommendation history retrieved successfully")

from app.schemas import WorkoutPlanCreateSchema, WorkoutPlanUpdateSchema

@router.get("/workout/today", status_code=status.HTTP_200_OK)
async def get_today_workout_plan(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get or generate today's daily workout plan"""
    service = RecommendationService(db)
    result = await service.get_today_workout_plan(current_user["user_id"])
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"]
        )
    return ResponseFormatter.success(result, "Today's workout plan retrieved successfully")

@router.post("/workout/plans", status_code=status.HTTP_201_CREATED)
async def create_custom_workout_plan(
    plan: WorkoutPlanCreateSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Create a custom workout plan"""
    service = RecommendationService(db)
    result = await service.create_workout_plan(current_user["user_id"], plan.dict())
    return ResponseFormatter.success(result, "Workout plan created successfully", 201)

@router.get("/workout/plans/{plan_id}", status_code=status.HTTP_200_OK)
async def get_workout_plan_details(
    plan_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get workout plan details"""
    service = RecommendationService(db)
    result = await service.get_workout_plan(current_user["user_id"], plan_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found"
        )
    return ResponseFormatter.success(result, "Workout plan details retrieved successfully")

@router.put("/workout/plans/{plan_id}", status_code=status.HTTP_200_OK)
async def update_workout_plan_details(
    plan_id: str,
    plan: WorkoutPlanUpdateSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Update workout plan details"""
    service = RecommendationService(db)
    success = await service.update_workout_plan(
        current_user["user_id"],
        plan_id,
        plan.dict(exclude_none=True)
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found or not modified"
        )
    return ResponseFormatter.success(None, "Workout plan updated successfully")

@router.delete("/workout/plans/{plan_id}", status_code=status.HTTP_200_OK)
async def delete_workout_plan(
    plan_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Delete workout plan"""
    service = RecommendationService(db)
    success = await service.delete_workout_plan(current_user["user_id"], plan_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found"
        )
    return ResponseFormatter.success(None, "Workout plan deleted successfully")

@router.put("/workout/plans/{plan_id}/exercise", status_code=status.HTTP_200_OK)
async def toggle_exercise_completion_status(
    plan_id: str,
    exercise_name: str = Query(...),
    is_completed: bool = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Toggle completion status of a specific exercise in a plan"""
    service = RecommendationService(db)
    result = await service.toggle_exercise_completion(
        current_user["user_id"],
        plan_id,
        exercise_name,
        is_completed
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan or exercise not found"
        )
    return ResponseFormatter.success(result, "Exercise completion status updated")

@router.post("/workout/plans/{plan_id}/complete", status_code=status.HTTP_200_OK)
async def toggle_workout_completion_status(
    plan_id: str,
    is_completed: bool = Query(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Toggle completion status of the entire workout plan"""
    service = RecommendationService(db)
    result = await service.toggle_workout_completion(
        current_user["user_id"],
        plan_id,
        is_completed
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout plan not found"
        )
    return ResponseFormatter.success(result, "Workout completion status updated")

@router.get("/workout/history-logs", status_code=status.HTTP_200_OK)
async def get_workout_plan_history_logs(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get history logs of user's daily workout plans"""
    service = RecommendationService(db)
    result = await service.get_workout_plan_history(current_user["user_id"])
    return ResponseFormatter.success(result, "Workout history logs retrieved successfully")
