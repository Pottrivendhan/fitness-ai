from fastapi import APIRouter, Depends, status, HTTPException, Path
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_database
from app.schemas import CalorieCalculationSchema, CalorieHistoryResponseSchema
from app.services.calories import CalorieService
from app.middleware import get_current_user
from app.utils import ResponseFormatter
from typing import Dict, Any, List

router = APIRouter(prefix="/calories", tags=["calories"])

@router.post("/calculate", status_code=status.HTTP_201_CREATED)
async def calculate_calories(
    calorie_data: CalorieCalculationSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Calculate calorie goals and save calculations to history"""
    calorie_service = CalorieService(db)
    result = await calorie_service.calculate_and_save(current_user["user_id"], calorie_data)
    return ResponseFormatter.success(result, "Calorie calculation saved successfully", 201)

@router.get("/history", status_code=status.HTTP_200_OK)
async def get_calorie_history(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get calorie calculation history"""
    calorie_service = CalorieService(db)
    history = await calorie_service.get_history(current_user["user_id"])
    return ResponseFormatter.success(history, "Calorie history retrieved successfully")

@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_calorie_history(
    id: str = Path(..., description="The ID of the calorie history entry to delete"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Delete calorie history entry"""
    calorie_service = CalorieService(db)
    deleted = await calorie_service.delete_item(current_user["user_id"], id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Calorie history entry not found or not owned by user"
        )
    return ResponseFormatter.success(None, "Calorie history entry deleted successfully")
