from fastapi import APIRouter, Depends, status, HTTPException, Path
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_database
from app.schemas import BMICalculationSchema, BMIHistoryResponseSchema
from app.services.bmi import BMIService
from app.middleware import get_current_user
from app.utils import ResponseFormatter
from typing import Dict, Any, List

router = APIRouter(prefix="/bmi", tags=["bmi"])

@router.post("/calculate", status_code=status.HTTP_201_CREATED)
async def calculate_bmi(
    bmi_data: BMICalculationSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Calculate and save BMI"""
    bmi_service = BMIService(db)
    result = await bmi_service.calculate_and_save(current_user["user_id"], bmi_data)
    return ResponseFormatter.success(result, "BMI calculated and saved successfully", 201)

@router.get("/history", status_code=status.HTTP_200_OK)
async def get_bmi_history(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get BMI calculation history"""
    bmi_service = BMIService(db)
    history = await bmi_service.get_history(current_user["user_id"])
    return ResponseFormatter.success(history, "BMI history retrieved successfully")

@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_bmi_history(
    id: str = Path(..., description="The ID of the BMI history entry to delete"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Delete BMI history entry"""
    bmi_service = BMIService(db)
    deleted = await bmi_service.delete_item(current_user["user_id"], id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="BMI history entry not found or not owned by user"
        )
    return ResponseFormatter.success(None, "BMI history entry deleted successfully")
