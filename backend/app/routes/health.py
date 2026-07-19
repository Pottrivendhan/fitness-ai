from fastapi import APIRouter, HTTPException, status, Depends, Body, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_database
from app.schemas import BMICalculationSchema, CalorieCalculationSchema, HealthLogCreateSchema
from app.services.health import HealthService
from app.middleware import get_current_user
from app.utils import ResponseFormatter
from typing import Dict, Any

router = APIRouter(prefix="/health", tags=["health"])

@router.post("/calculate/bmi", status_code=status.HTTP_200_OK)
async def calculate_bmi(
    bmi_data: BMICalculationSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Calculate BMI"""
    health_service = HealthService(db)
    result = await health_service.calculate_bmi(current_user["user_id"], bmi_data)
    return ResponseFormatter.success(result, "BMI calculated successfully")

@router.post("/calculate/calories", status_code=status.HTTP_200_OK)
async def calculate_calories(
    calorie_data: CalorieCalculationSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Calculate daily calorie requirements"""
    health_service = HealthService(db)
    result = await health_service.calculate_calories(current_user["user_id"], calorie_data)
    return ResponseFormatter.success(result, "Calories calculated successfully")

@router.post("/calculate/water", status_code=status.HTTP_200_OK)
async def calculate_water_intake(
    weight_kg: float = Body(..., gt=0),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Calculate daily water intake"""
    health_service = HealthService(db)
    result = await health_service.calculate_water_intake(weight_kg)
    return ResponseFormatter.success(result, "Water intake calculated successfully")

@router.post("/log", status_code=status.HTTP_201_CREATED)
async def log_health_data(
    log_data: HealthLogCreateSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Log health data"""
    health_service = HealthService(db)
    result = await health_service.log_health_data(
        current_user["user_id"],
        log_data.dict(exclude_none=True)
    )
    return ResponseFormatter.success(result, "Health data logged successfully", 201)

@router.get("/logs/today", status_code=status.HTTP_200_OK)
async def get_today_logs(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get today's health logs"""
    health_service = HealthService(db)
    result = await health_service.get_today_logs(current_user["user_id"])
    return ResponseFormatter.success(result, "Today's logs retrieved successfully")

@router.get("/logs/weekly", status_code=status.HTTP_200_OK)
async def get_weekly_logs(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get weekly health logs"""
    health_service = HealthService(db)
    result = await health_service.get_weekly_logs(current_user["user_id"])
    return ResponseFormatter.success(result, "Weekly logs retrieved successfully")

@router.get("/logs/monthly", status_code=status.HTTP_200_OK)
async def get_monthly_logs(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get monthly health logs"""
    health_service = HealthService(db)
    result = await health_service.get_monthly_logs(current_user["user_id"])
    return ResponseFormatter.success(result, "Monthly logs retrieved successfully")

@router.get("/stats", status_code=status.HTTP_200_OK)
async def get_health_stats(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get health statistics"""
    health_service = HealthService(db)
    result = await health_service.get_health_stats(current_user["user_id"])
    return ResponseFormatter.success(result, "Health statistics retrieved successfully")

@router.delete("/logs/{log_id}", status_code=status.HTTP_200_OK)
async def delete_log(
    log_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Delete health log"""
    health_service = HealthService(db)
    success = await health_service.delete_log(current_user["user_id"], log_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Log not found"
        )
    
    return ResponseFormatter.success(None, "Log deleted successfully")

@router.put("/logs/{log_id}", status_code=status.HTTP_200_OK)
async def update_log(
    log_id: str,
    log_data: Dict[str, Any] = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Update health log"""
    health_service = HealthService(db)
    success = await health_service.update_log(
        current_user["user_id"],
        log_id,
        log_data
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Log not found"
        )
    
    return ResponseFormatter.success(None, "Log updated successfully")
