from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
from app.security import verify_token, is_token_expired
from app.config import settings

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """Get current authenticated user from JWT token"""
    token = credentials.credentials

    try:
        # Check if token is expired
        if is_token_expired(token):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Verify token
        payload = verify_token(token)
        user_id = payload.get("sub")
        email = payload.get("email")

        if user_id is None or email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return {"user_id": user_id, "email": email}

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    )
):
    """Get current user optionally (doesn't require authentication)"""
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None

class RateLimiter:
    """Simple rate limiter"""
    def __init__(self, requests: int = 100, period: int = 60):
        self.requests = requests
        self.period = period
        self.store = {}
    
    async def check_limit(self, key: str) -> bool:
        """Check if request is within rate limit"""
        import time
        current_time = time.time()
        
        if key not in self.store:
            self.store[key] = []
        
        # Remove old requests
        self.store[key] = [req_time for req_time in self.store[key] 
                          if current_time - req_time < self.period]
        
        # Check if limit exceeded
        if len(self.store[key]) >= self.requests:
            return False
        
        self.store[key].append(current_time)
        return True

rate_limiter = RateLimiter(
    requests=settings.RATE_LIMIT_REQUESTS,
    period=settings.RATE_LIMIT_PERIOD
)

async def rate_limit(key: str) -> bool:
    """Rate limit dependency"""
    allowed = await rate_limiter.check_limit(key)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests"
        )
    return True

async def admin_required(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Check if user is admin"""
    # This would require fetching user from database to check role
    # For now, we'll return the user if they're authenticated
    # In production, fetch from DB and verify role
    return current_user
