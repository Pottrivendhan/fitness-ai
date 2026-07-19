from fastapi import APIRouter, Depends, status, HTTPException, Path, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_database
from app.services.diet import DietService
from app.middleware import get_current_user
from app.utils import ResponseFormatter
from typing import Dict, Any, List

router = APIRouter(prefix="/diet", tags=["diet"])

@router.get("/plans/today", status_code=status.HTTP_200_OK)
async def get_today_diet(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get today's daily diet plan, creating it dynamically if it does not exist"""
    diet_service = DietService(db)
    result = await diet_service.get_or_create_today_plan(current_user["user_id"])
    return ResponseFormatter.success(result, "Today's diet plan retrieved successfully")

@router.put("/plans/{id}/meal", status_code=status.HTTP_200_OK)
async def toggle_meal_completion(
    id: str = Path(..., description="The ID of the daily diet plan"),
    meal_key: str = Query(..., description="The meal key, e.g. breakfast, lunch"),
    is_completed: bool = Query(..., description="The completion flag value"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Toggle the completion status of a specific meal inside a daily plan"""
    diet_service = DietService(db)
    result = await diet_service.toggle_meal_completion(
        current_user["user_id"],
        id,
        meal_key,
        is_completed
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diet plan not found or invalid meal key"
        )
    return ResponseFormatter.success(result, "Meal completion status updated successfully")

@router.get("/history", status_code=status.HTTP_200_OK)
async def get_diet_history(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get history logs of daily diet plans"""
    diet_service = DietService(db)
    history = await diet_service.get_history(current_user["user_id"])
    return ResponseFormatter.success(history, "Diet plan history retrieved successfully")

@router.delete("/plans/{id}", status_code=status.HTTP_200_OK)
async def delete_diet_plan(
    id: str = Path(..., description="The ID of the daily diet plan to delete"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Delete a daily diet plan"""
    diet_service = DietService(db)
    deleted = await diet_service.delete_plan(current_user["user_id"], id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Diet plan not found"
        )
    return ResponseFormatter.success(None, "Diet plan deleted successfully")

@router.get("/foods", status_code=status.HTTP_200_OK)
async def search_food_database(
    query: str = Query(..., min_length=1, description="Food keyword search query"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Search seeded food database with nutrition values"""
    diet_service = DietService(db)
    results = await diet_service.search_foods(query)
    return ResponseFormatter.success(results, "Food database search completed")
