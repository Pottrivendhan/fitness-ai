from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.config import settings
from app.database import connect_to_mongo, close_mongo_connection
from app.routes import auth, profile, health, recommendations, chat, analytics, bmi, calories, diet
import app.routes.settings as settings_router
from app.utils import ResponseFormatter
import logging

# Configure logging
logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for app startup and shutdown"""
    # Startup
    logger.info("Starting Fitness AI API...")
    await connect_to_mongo()
    logger.info("✓ Connected to MongoDB")
    yield
    # Shutdown
    logger.info("Shutting down Fitness AI API...")
    await close_mongo_connection()
    logger.info("✓ Disconnected from MongoDB")

app = FastAPI(
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version=settings.API_VERSION,
    lifespan=lifespan
)

# CORS Configuration
from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://fitness-ai-ten-sigma.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
from fastapi.staticfiles import StaticFiles
import os

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_CREDENTIALS,
    allow_methods=settings.CORS_METHODS,
    allow_headers=settings.CORS_HEADERS,
)

# Custom Logging Middleware to calculate response time
import time
from fastapi import Request

@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    start_time = time.time()
    
    # Try to extract user info from Authorization header if available
    auth_header = request.headers.get("Authorization")
    user_str = "Anonymous"
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            from app.security import decode_token
            payload = decode_token(token)
            if payload:
                user_str = f"User {payload.get('sub')} ({payload.get('email')})"
        except Exception:
            pass
            
    # Process request
    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        
        # Log response info
        log_msg = f"{request.method} {request.url.path} - Status: {response.status_code} - User: {user_str} - Duration: {process_time:.2f}ms"
        if response.status_code >= 550:
            logger.error(log_msg)
        elif response.status_code >= 400:
            logger.warning(log_msg)
        else:
            logger.info(log_msg)
            
        return response
    except Exception as exc:
        process_time = (time.time() - start_time) * 1000
        logger.error(f"{request.method} {request.url.path} - Exception: {str(exc)} - User: {user_str} - Duration: {process_time:.2f}ms", exc_info=True)
        raise

# Mount static uploads directory
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount(f"/{settings.UPLOAD_DIR}", StaticFiles(directory=settings.UPLOAD_DIR), name=settings.UPLOAD_DIR)
# Exception handlers
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    """Handle request validation exceptions"""
    error_msgs = []
    for err in exc.errors():
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        msg = err.get("msg", "")
        error_msgs.append(f"{loc}: {msg}")
    error_str = "; ".join(error_msgs)
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "Validation failed",
            "error": error_str
        }
    )

@app.exception_handler(StarletteHTTPException)
async def starlette_http_exception_handler(request, exc):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "error": str(exc.detail)
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "An unexpected error occurred",
            "error": str(exc)
        }
    )

# Health check endpoint
@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint"""
    from app.database import db
    database_status = "disconnected"
    if db.client is not None:
        try:
            await db.client.admin.command('ping')
            database_status = "connected"
        except Exception:
            pass
    return {
        "status": "healthy",
        "database": database_status,
        "version": "1.0.0"
    }

# Root endpoint
@app.get("/", tags=["root"])
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Fitness AI API",
        "version": settings.API_VERSION,
        "docs": "/docs",
        "openapi": "/openapi.json"
    }

# Include routers
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(health.router)
app.include_router(recommendations.router)
app.include_router(chat.router)
app.include_router(analytics.router)
app.include_router(bmi.router)
app.include_router(calories.router)
app.include_router(diet.router)
app.include_router(settings_router.router)

# Swagger documentation configuration
app.openapi_tags = [
    {
        "name": "health",
        "description": "Health check endpoints"
    },
    {
        "name": "root",
        "description": "Root endpoints"
    },
    {
        "name": "authentication",
        "description": "User authentication endpoints (login, register, password reset)"
    },
    {
        "name": "profile",
        "description": "User profile management endpoints"
    },
    {
        "name": "health",
        "description": "Health calculations and tracking endpoints"
    },
    {
        "name": "recommendations",
        "description": "Personalized workout and diet recommendations"
    },
    {
        "name": "chat",
        "description": "AI fitness assistant chat endpoints"
    },
    {
        "name": "analytics",
        "description": "Analytics, reports, and progress tracking"
    }
]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
