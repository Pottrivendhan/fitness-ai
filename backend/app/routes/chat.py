from fastapi import APIRouter, HTTPException, status, Depends, Body, Query, Path, File, UploadFile
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_database
from app.services.chat import ChatService
from app.middleware import get_current_user
from app.utils import ResponseFormatter
from app.schemas import ChatRequestSchema, ConversationRenameSchema, MessageReactionSchema
from typing import Dict, Any, Optional, List
import logging
import traceback
import os
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

# Directory configuration for uploaded files
CHAT_UPLOAD_DIR = "uploads/chat"
IMAGE_UPLOAD_DIR = "uploads/images"

os.makedirs(CHAT_UPLOAD_DIR, exist_ok=True)
os.makedirs(IMAGE_UPLOAD_DIR, exist_ok=True)

ALLOWED_DOC_EXTENSIONS = {".pdf", ".docx", ".txt", ".csv", ".xlsx"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

@router.post("", status_code=status.HTTP_200_OK)
async def process_chat_message(
    request: ChatRequestSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Process user chat message and return AI fitness coach response"""
    user_message = request.message
    conversation_id = request.conversation_id
    attachments = request.attachments
    
    if (not user_message or not user_message.strip()) and not attachments:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content=ResponseFormatter.error("Message or attachments cannot be empty", 400)
        )
        
    try:
        chat_service = ChatService(db)
        result = await chat_service.process_chat_message(
            current_user["user_id"],
            user_message,
            conversation_id,
            attachments
        )
        return ResponseFormatter.success(result, "Response generated successfully", 200)
    except Exception as e:
        logger.error(f"Error processing chat message: {traceback.format_exc()}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ResponseFormatter.error(f"An error occurred while generating a response: {str(e)}", 500)
        )

@router.post("/upload", status_code=status.HTTP_200_OK)
async def upload_chat_file(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Upload document for chat analysis"""
    try:
        filename = file.filename
        _, ext = os.path.splitext(filename.lower())
        if ext not in ALLOWED_DOC_EXTENSIONS:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content=ResponseFormatter.error(f"Invalid file type. Allowed formats: {', '.join(ALLOWED_DOC_EXTENSIONS)}", 400)
            )
        
        contents = await file.read()
        size = len(contents)
        if size > 20 * 1024 * 1024:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content=ResponseFormatter.error("File size exceeds the 20MB limit", 400)
            )
        
        file_id = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(CHAT_UPLOAD_DIR, file_id)
        
        with open(file_path, "wb") as f:
            f.write(contents)
            
        return ResponseFormatter.success({
            "file_id": file_id,
            "filename": filename,
            "type": file.content_type or f"application/{ext[1:]}",
            "size": size
        }, "File uploaded successfully")
    except Exception as e:
        logger.error(f"Error uploading document: {traceback.format_exc()}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ResponseFormatter.error(f"Failed to upload document: {str(e)}", 500)
        )

@router.post("/image", status_code=status.HTTP_200_OK)
async def upload_chat_image(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Upload image for chat vision analysis"""
    try:
        filename = file.filename
        _, ext = os.path.splitext(filename.lower())
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content=ResponseFormatter.error(f"Invalid image type. Allowed formats: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}", 400)
            )
        
        contents = await file.read()
        size = len(contents)
        if size > 10 * 1024 * 1024:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content=ResponseFormatter.error("Image size exceeds the 10MB limit", 400)
            )
        
        file_id = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(IMAGE_UPLOAD_DIR, file_id)
        
        with open(file_path, "wb") as f:
            f.write(contents)
            
        return ResponseFormatter.success({
            "file_id": file_id,
            "filename": filename,
            "type": file.content_type or f"image/{ext[1:]}",
            "size": size
        }, "Image uploaded successfully")
    except Exception as e:
        logger.error(f"Error uploading image: {traceback.format_exc()}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ResponseFormatter.error(f"Failed to upload image: {str(e)}", 500)
        )

# Maintain backward compatibility alias
@router.post("/message", status_code=status.HTTP_200_OK)
async def send_message_alias(
    request: ChatRequestSchema,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Alias for POST /chat (backward compatibility)"""
    return await process_chat_message(request, current_user, db)

@router.get("/history", status_code=status.HTTP_200_OK)
async def get_conversations(
    search: Optional[str] = Query(None, description="Search query for conversation titles"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Retrieve chat history (conversations list) for the authenticated user"""
    try:
        chat_service = ChatService(db)
        result = await chat_service.get_conversations(current_user["user_id"], search)
        return ResponseFormatter.success(result, "Chat history retrieved successfully")
    except Exception as e:
        logger.error(f"Error fetching conversations history: {str(e)}")
        return ResponseFormatter.success([], "Chat history retrieved with empty default")

@router.get("/{id}", status_code=status.HTTP_200_OK)
async def get_conversation_details(
    conversation_id: str = Path(..., alias="id"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Get details of a specific conversation, including all its messages"""
    try:
        chat_service = ChatService(db)
        result = await chat_service.get_conversation(current_user["user_id"], conversation_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        return ResponseFormatter.success(result, "Conversation retrieved successfully")
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error fetching conversation {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving conversation"
        )

@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_conversation(
    conversation_id: str = Path(..., alias="id"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Delete a specific chat conversation"""
    try:
        chat_service = ChatService(db)
        success = await chat_service.delete_conversation(current_user["user_id"], conversation_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        return ResponseFormatter.success(None, "Conversation deleted successfully")
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error deleting conversation {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting conversation"
        )

# Keep /history delete as a 'clear all' alias
@router.delete("/history", status_code=status.HTTP_200_OK)
async def clear_all_conversations(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Clear all chat conversations history"""
    try:
        chat_service = ChatService(db)
        conversations = await chat_service.get_conversations(current_user["user_id"])
        deleted_count = 0
        for convo in conversations:
            convo_id = convo.get("conversation_id")
            if convo_id:
                await chat_service.delete_conversation(current_user["user_id"], convo_id)
                deleted_count += 1
        return ResponseFormatter.success(None, f"Successfully cleared all {deleted_count} conversations")
    except Exception as e:
        logger.error(f"Error clearing conversations history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error clearing history"
        )

@router.put("/{id}/rename", status_code=status.HTTP_200_OK)
async def rename_conversation(
    conversation_id: str = Path(..., alias="id"),
    payload: ConversationRenameSchema = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Rename a specific conversation's title"""
    title = payload.title
    if not title or not title.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title cannot be empty"
        )
        
    try:
        chat_service = ChatService(db)
        result = await chat_service.rename_conversation(
            current_user["user_id"],
            conversation_id,
            title
        )
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        return ResponseFormatter.success(result, "Conversation renamed successfully")
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error renaming conversation {conversation_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error renaming conversation"
        )

@router.put("/{id}/message/{msg_idx}/reaction", status_code=status.HTTP_200_OK)
async def message_reaction(
    conversation_id: str = Path(..., alias="id"),
    msg_idx: int = Path(..., ge=0),
    payload: MessageReactionSchema = Body(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> Dict[str, Any]:
    """Like or dislike a specific assistant response in the conversation message list"""
    reaction_type = payload.reaction_type  # 'like' or 'dislike'
    status_val = payload.status  # True or False
    
    try:
        chat_service = ChatService(db)
        result = await chat_service.toggle_message_reaction(
            current_user["user_id"],
            conversation_id,
            msg_idx,
            reaction_type,
            status_val
        )
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation or message index not found"
            )
        return ResponseFormatter.success(result, "Reaction toggled successfully")
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error toggling reaction: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error toggling reaction"
        )
