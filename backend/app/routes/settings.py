from fastapi import APIRouter, Depends, Body, status, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_database
from app.services.settings import SettingsService
from app.middleware import get_current_user
from app.utils import ResponseFormatter
from app.schemas import SettingsUpdateSchema, AppearanceSettingsUpdateSchema, NotificationSettingsUpdateSchema, PrivacySettingsUpdateSchema, SecuritySettingsUpdateSchema
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("", status_code=status.HTTP_200_OK)
async def get_settings(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Retrieve settings for the authenticated user"""
    try:
        service = SettingsService(db)
        result = await service.get_settings(current_user["user_id"])
        return ResponseFormatter.success(result, "Settings retrieved successfully")
    except Exception as e:
        logger.error(f"Error fetching settings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving settings configuration"
        )

@router.put("", status_code=status.HTTP_200_OK)
async def update_settings(
    settings_data: SettingsUpdateSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Update settings configuration"""
    try:
        service = SettingsService(db)
        result = await service.update_settings(current_user["user_id"], settings_data.dict(exclude_unset=True))
        return ResponseFormatter.success(result, "Settings updated successfully")
    except Exception as e:
        logger.error(f"Error updating settings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating settings"
        )

@router.put("/theme", status_code=status.HTTP_200_OK)
async def update_theme(
    theme_data: AppearanceSettingsUpdateSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Update only theme appearance configuration"""
    try:
        service = SettingsService(db)
        result = await service.update_theme(current_user["user_id"], theme_data.dict(exclude_unset=True))
        return ResponseFormatter.success(result, "Appearance configuration updated successfully")
    except Exception as e:
        logger.error(f"Error updating theme settings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating appearance"
        )

@router.put("/notifications", status_code=status.HTTP_200_OK)
async def update_notifications(
    notif_data: NotificationSettingsUpdateSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Update notifications config parameters"""
    try:
        service = SettingsService(db)
        result = await service.update_notifications(current_user["user_id"], notif_data.dict(exclude_unset=True))
        return ResponseFormatter.success(result, "Notifications configuration updated successfully")
    except Exception as e:
        logger.error(f"Error updating notifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating notifications settings"
        )

@router.put("/privacy", status_code=status.HTTP_200_OK)
async def update_privacy(
    privacy_data: PrivacySettingsUpdateSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Update privacy settings parameters"""
    try:
        service = SettingsService(db)
        result = await service.update_privacy(current_user["user_id"], privacy_data.dict(exclude_unset=True))
        return ResponseFormatter.success(result, "Privacy configuration updated successfully")
    except Exception as e:
        logger.error(f"Error updating privacy settings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating privacy parameters"
        )

@router.put("/security", status_code=status.HTTP_200_OK)
async def update_security(
    security_data: SecuritySettingsUpdateSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Update security configuration parameters"""
    try:
        service = SettingsService(db)
        result = await service.update_security(current_user["user_id"], security_data.dict(exclude_unset=True))
        return ResponseFormatter.success(result, "Security configuration updated successfully")
    except Exception as e:
        logger.error(f"Error updating security settings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating security settings"
        )

@router.get("/security/login-history", status_code=status.HTTP_200_OK)
async def get_login_history(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Retrieve simulated user session login history"""
    import datetime
    try:
        # Construct clean simulated session logs for active sessions list
        history = [
            {
                "session_id": "session_active_01",
                "ip_address": "192.168.1.42",
                "device": "Chrome Web (Windows 11) - Active Session",
                "location": "Dallas, TX (USA)",
                "timestamp": datetime.datetime.utcnow().isoformat()
            },
            {
                "session_id": "session_past_02",
                "ip_address": "172.56.21.90",
                "device": "Safari Mobile (iPhone 15 Pro)",
                "location": "Austin, TX (USA)",
                "timestamp": (datetime.datetime.utcnow() - datetime.timedelta(days=2)).isoformat()
            },
            {
                "session_id": "session_past_03",
                "ip_address": "104.244.72.1",
                "device": "Firefox Web (Mac OS Sonoma)",
                "location": "San Francisco, CA (USA)",
                "timestamp": (datetime.datetime.utcnow() - datetime.timedelta(days=7)).isoformat()
            }
        ]
        return ResponseFormatter.success(history, "Login session history logs retrieved successfully")
    except Exception as e:
        logger.error(f"Error building login history: {str(e)}")
        return ResponseFormatter.success([], "Session history retrieved with empty default")

@router.get("/export", status_code=status.HTTP_200_OK)
async def export_data(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Export all user data logs"""
    try:
        service = SettingsService(db)
        result = await service.get_export_data(current_user["user_id"])
        return ResponseFormatter.success(result, "All user logs compiled successfully for export")
    except Exception as e:
        logger.error(f"Error executing data export: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error generating data logs export"
        )

@router.delete("/account", status_code=status.HTTP_200_OK)
async def delete_account(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Completely delete the user's account and all associated database documents"""
    try:
        service = SettingsService(db)
        success = await service.delete_all_user_data(current_user["user_id"])
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User account not found"
            )
        return ResponseFormatter.success(None, "Your user profile and all fitness logs have been permanently deleted.")
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error executing account deletion: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting user account"
        )
