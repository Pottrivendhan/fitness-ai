from fastapi import APIRouter, HTTPException, status, Depends, Body
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_database
from app.schemas import UserRegisterSchema, UserLoginSchema, TokenRefreshSchema, PasswordResetRequestSchema, PasswordResetSchema, ChangePasswordSchema
from app.services.auth import AuthService
from app.middleware import get_current_user
from app.utils import ResponseFormatter
from typing import Dict, Any

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserRegisterSchema,
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Register new user"""
    auth_service = AuthService(db)
    result = await auth_service.register(user_data)
    return ResponseFormatter.success(result, "User registered successfully", 201)

@router.post("/login", status_code=status.HTTP_200_OK)
async def login(
    login_data: UserLoginSchema,
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Login user"""
    auth_service = AuthService(db)
    result = await auth_service.login(login_data)
    return ResponseFormatter.success(result, "Login successful")

@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Logout user"""
    auth_service = AuthService(db)
    await auth_service.logout(current_user["user_id"])
    return ResponseFormatter.success(None, "Logged out successfully")

@router.post("/refresh", status_code=status.HTTP_200_OK)
async def refresh_token(
    token_data: TokenRefreshSchema,
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Refresh access token"""
    auth_service = AuthService(db)
    tokens = await auth_service.refresh_token(token_data.refresh_token)
    return ResponseFormatter.success(tokens, "Token refreshed successfully")

@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    request: PasswordResetRequestSchema,
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Request password reset"""
    auth_service = AuthService(db)
    result = await auth_service.request_password_reset(request.email)
    return ResponseFormatter.success(result, "Password reset email sent")

@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    reset_data: PasswordResetSchema,
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Reset password with token"""
    if reset_data.new_password != reset_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    auth_service = AuthService(db)
    await auth_service.reset_password(reset_data.token, reset_data.new_password)
    return ResponseFormatter.success(None, "Password reset successfully")

@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    password_data: ChangePasswordSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Change password for authenticated user"""
    old_password = password_data.old_password
    new_password = password_data.new_password
    confirm_password = password_data.confirm_password
    
    if new_password != confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match"
        )
    
    auth_service = AuthService(db)
    await auth_service.change_password(current_user["user_id"], old_password, new_password)
    return ResponseFormatter.success(None, "Password changed successfully")

@router.delete("/account", status_code=status.HTTP_200_OK)
async def delete_account(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Delete user account"""
    auth_service = AuthService(db)
    await auth_service.delete_user(current_user["user_id"])
    return ResponseFormatter.success(None, "Account deleted successfully")
