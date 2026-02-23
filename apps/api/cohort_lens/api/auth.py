"""JWT authentication for CohortLens API."""

import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

# Configuration from env
JWT_SECRET = os.environ.get("JWT_SECRET", "cohortlens-dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", "60"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/token", auto_error=False)
http_bearer = HTTPBearer(auto_error=False)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=JWT_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> Optional[dict]:
    """Verify JWT and return payload or None."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
) -> Optional[dict]:
    """Dependency: get current user from Bearer token. Returns None if no auth."""
    if not credentials:
        return None
    payload = verify_token(credentials.credentials)
    if not payload or "sub" not in payload:
        return None
    
    # Try to get fresh user data from DB
    from cohort_lens.data.users import get_user_by_username
    user = get_user_by_username(payload["sub"])
    if user:
        return user
        
    # Fallback to payload data if user not in DB anymore (or during migration)
    return payload


def require_auth(user: Optional[dict] = Depends(get_current_user)) -> dict:
    """Dependency: require valid JWT. Raises 401 if not authenticated."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def hash_password(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify password against hash."""
    return pwd_context.verify(plain, hashed)


def get_default_user_hash() -> str:
    """Default dev user hash (admin/admin). Override in production."""
    # Note: password is 'admin' by default
    return pwd_context.hash(os.environ.get("DEFAULT_USER_PASSWORD", "admin"))


def authenticate_user(username: str, password: str) -> Optional[dict]:
    """Authenticate user against DB or dev fallback."""
    from cohort_lens.data.users import get_user_by_username, update_last_login
    
    user = get_user_by_username(username)
    if not user:
        # Dev fallback
        default_user = os.environ.get("DEFAULT_AUTH_USER", "admin")
        if username == default_user:
            if verify_password(password, get_default_user_hash()):
                return {"username": username, "tenant_id": username, "is_admin": True}
        return None
    
    if not user.get("is_active", True):
        return None
        
    if verify_password(password, user["hashed_password"]):
        update_last_login(username)
        return user
    return None
