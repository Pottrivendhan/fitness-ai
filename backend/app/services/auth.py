from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from app.schemas import UserRegisterSchema, UserLoginSchema, UserResponseSchema
from app.security import hash_password, verify_password, create_access_token, create_refresh_token, verify_token
from app.utils import convert_object_id, generate_id
from pymongo.errors import DuplicateKeyError
import logging

logger = logging.getLogger(__name__)

class AuthService:
    """Authentication service"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.users_collection = db.users
        self.settings_collection = db.settings
    
    async def register(self, user_data: UserRegisterSchema) -> Dict[str, Any]:
        """Register new user"""
        # Check if user already exists
        existing_user = await self.users_collection.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Validate password match
        if user_data.password != user_data.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Passwords do not match"
            )
        
        # Create user document
        user_doc = {
            "email": user_data.email,
            "name": user_data.name,
            "password_hash": hash_password(user_data.password),
            "role": "user",
            "is_active": True,
            "email_verified": False,
            "avatar_url": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_login": None
        }
        
        try:
            result = await self.users_collection.insert_one(user_doc)
        except DuplicateKeyError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        user_id = str(result.inserted_id)
        logger.info(f"User registered successfully: {user_data.email} (ID: {user_id})")
        
        # Create default settings
        settings_doc = {
            "user_id": ObjectId(user_id),
            "dark_mode": False,
            "notifications_enabled": True,
            "email_reminders": False,
            "language": "en",
            "timezone": "UTC",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await self.settings_collection.insert_one(settings_doc)
        
        # Generate tokens
        tokens = self._generate_tokens(user_id, user_data.email)
        
        return {
            "user": {
                "id": user_id,
                "email": user_data.email,
                "name": user_data.name,
                "role": "user"
            },
            "tokens": tokens
        }
    
    async def login(self, login_data: UserLoginSchema) -> Dict[str, Any]:
        """Login user"""
        # Find user
        user = await self.users_collection.find_one({"email": login_data.email})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Verify password
        if not verify_password(login_data.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if user is active
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )
        
        # Update last login
        await self.users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        
        user_id = str(user["_id"])
        tokens = self._generate_tokens(user_id, user["email"])
        logger.info(f"User logged in successfully: {user['email']} (ID: {user_id})")
        
        return {
            "user": {
                "id": user_id,
                "email": user["email"],
                "name": user["name"],
                "role": user.get("role", "user")
            },
            "tokens": tokens
        }
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        user = await self.users_collection.find_one({"_id": ObjectId(user_id)})
        if user:
            return convert_object_id(user)
        return None
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        user = await self.users_collection.find_one({"email": email})
        if user:
            return convert_object_id(user)
        return None
    
    async def refresh_token(self, refresh_token: str) -> Dict[str, str]:
        """Refresh access token"""
        try:
            payload = verify_token(refresh_token)
            
            if payload.get("type") != "refresh":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid refresh token"
                )
            
            user_id = payload.get("sub")
            user = await self.get_user_by_id(user_id)
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found"
                )
            
            # Generate new tokens
            tokens = self._generate_tokens(user_id, user["email"])
            return tokens
        
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    
    async def change_password(self, user_id: str, old_password: str, new_password: str) -> bool:
        """Change user password"""
        user = await self.get_user_by_id(user_id)
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if not verify_password(old_password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        result = await self.users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {
                "password_hash": hash_password(new_password),
                "updated_at": datetime.utcnow()
            }}
        )
        
        return result.modified_count > 0
    
    async def request_password_reset(self, email: str) -> Dict[str, str]:
        """Request password reset"""
        user = await self.get_user_by_email(email)
        
        if not user:
            # Don't reveal if email exists
            return {"message": "If email exists, reset link will be sent"}
        
        # Generate reset token (valid for 24 hours)
        reset_token = create_access_token(
            {"sub": user["_id"], "type": "reset"},
            timedelta(hours=24)
        )
        
        # In production, send email with reset link
        # For now, return token for testing
        return {
            "message": "Password reset token sent to email",
            "reset_token": reset_token  # Remove in production
        }
    
    async def reset_password(self, reset_token: str, new_password: str) -> bool:
        """Reset password with token"""
        try:
            payload = verify_token(reset_token)
            
            if payload.get("type") != "reset":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid reset token"
                )
            
            user_id = payload.get("sub")
            
            result = await self.users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {
                    "password_hash": hash_password(new_password),
                    "updated_at": datetime.utcnow()
                }}
            )
            
            return result.modified_count > 0
        
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired token"
            )
    
    async def logout(self, user_id: str) -> bool:
        """Logout user (placeholder - tokens are handled client-side)"""
        # Update last activity
        result = await self.users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"updated_at": datetime.utcnow()}}
        )
        return result.modified_count > 0
    
    def _generate_tokens(self, user_id: str, email: str) -> Dict[str, str]:
        """Generate access and refresh tokens"""
        access_token = create_access_token(
            {"sub": user_id, "email": email}
        )
        refresh_token = create_refresh_token(
            {"sub": user_id, "email": email}
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    
    async def verify_email(self, email: str) -> bool:
        """Mark email as verified"""
        result = await self.users_collection.update_one(
            {"email": email},
            {"$set": {"email_verified": True, "updated_at": datetime.utcnow()}}
        )
        return result.modified_count > 0
    
    async def delete_user(self, user_id: str) -> bool:
        """Delete user account"""
        # Delete user document
        result = await self.users_collection.delete_one({"_id": ObjectId(user_id)})
        
        if result.deleted_count > 0:
            # Delete associated data
            await self.db.profiles.delete_one({"user_id": ObjectId(user_id)})
            await self.db.health_logs.delete_many({"user_id": ObjectId(user_id)})
            await self.db.workouts.delete_many({"user_id": ObjectId(user_id)})
            await self.db.diet_plans.delete_many({"user_id": ObjectId(user_id)})
            await self.db.chat_history.delete_one({"user_id": ObjectId(user_id)})
            await self.settings_collection.delete_one({"user_id": ObjectId(user_id)})
            
            return True
        
        return False
