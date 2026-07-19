from fastapi import APIRouter, HTTPException, status, Depends, Query, File, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_database
from app.schemas import UserProfileCreateSchema, UserProfileUpdateSchema, UserInfoUpdateSchema
from app.services.profile import ProfileService
from app.middleware import get_current_user
from app.utils import ResponseFormatter
from app.config import settings
from typing import Dict, Any, Optional

router = APIRouter(prefix="/profile", tags=["profile"])

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_profile(
    profile_data: UserProfileCreateSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Create user profile"""
    profile_service = ProfileService(db)
    result = await profile_service.create_profile(current_user["user_id"], profile_data)
    return ResponseFormatter.success(result, "Profile created successfully", 201)

@router.get("/", status_code=status.HTTP_200_OK)
async def get_profile(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get current user profile"""
    profile_service = ProfileService(db)
    profile = await profile_service.get_profile(current_user["user_id"])
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    return ResponseFormatter.success(profile, "Profile retrieved successfully")

@router.get("/full", status_code=status.HTTP_200_OK)
async def get_full_user_info(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get full user information including profile"""
    profile_service = ProfileService(db)
    user_info = await profile_service.get_user_full_info(current_user["user_id"])
    
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return ResponseFormatter.success(user_info, "User information retrieved successfully")

@router.put("/", status_code=status.HTTP_200_OK)
async def update_profile(
    profile_data: UserProfileUpdateSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Update user profile"""
    profile_service = ProfileService(db)
    result = await profile_service.update_profile(current_user["user_id"], profile_data)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    return ResponseFormatter.success(result, "Profile updated successfully")

@router.post("/avatar", status_code=status.HTTP_200_OK)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Upload user profile avatar photo"""
    profile_service = ProfileService(db)
    avatar_url = await profile_service.upload_profile_avatar(
        current_user["user_id"],
        file,
        settings.UPLOAD_DIR
    )
    return ResponseFormatter.success({"avatar_url": avatar_url}, "Profile avatar uploaded successfully")

@router.put("/user-info", status_code=status.HTTP_200_OK)
async def update_user_info(
    update_data: UserInfoUpdateSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Update user information (name, avatar)"""
    profile_service = ProfileService(db)
    result = await profile_service.update_user_info(
        current_user["user_id"],
        name=update_data.name,
        avatar_url=update_data.avatar_url
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return ResponseFormatter.success(result, "User information updated successfully")

@router.get("/stats", status_code=status.HTTP_200_OK)
async def get_user_stats(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get user statistics"""
    profile_service = ProfileService(db)
    stats = await profile_service.get_user_stats(current_user["user_id"])
    return ResponseFormatter.success(stats, "User statistics retrieved successfully")

@router.get("/search", status_code=status.HTTP_200_OK)
async def search_users(
    query: str = Query(..., min_length=1),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Search users (admin function)"""
    profile_service = ProfileService(db)
    result = await profile_service.search_users(query, skip, limit)
    return ResponseFormatter.paginated(result["users"], result["total"], skip // limit + 1, limit)

@router.get("/list-all", status_code=status.HTTP_200_OK)
async def list_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """List all users (admin function)"""
    profile_service = ProfileService(db)
    result = await profile_service.list_all_users(skip, limit)
    return ResponseFormatter.paginated(result["users"], result["total"], skip // limit + 1, limit)
