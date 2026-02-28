"""JWT authentication for CohortLens API."""

import os
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

# Configuration from env — generate a random secret if none is set (dev safety net)
_default_secret = os.environ.get("JWT_SECRET", "")
if not _default_secret or _default_secret == "cohortlens-dev-secret-change-in-production":
    import logging as _logging
    _logging.getLogger(__name__).warning(
        "JWT_SECRET is not set or is the insecure default. "
        "A random secret has been generated for this process. "
        "Set JWT_SECRET in your environment for production use."
    )
    _default_secret = secrets.token_urlsafe(64)

JWT_SECRET = _default_secret
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", "60"))
JWT_REFRESH_EXPIRE_DAYS = int(os.environ.get("JWT_REFRESH_EXPIRE_DAYS", "7"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/token", auto_error=False)
http_bearer = HTTPBearer(auto_error=False)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=JWT_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(data: dict) -> str:
    """Create a JWT refresh token with longer expiry."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=JWT_REFRESH_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_refresh_token(token: str) -> Optional[dict]:
    """Verify a refresh token and return payload or None."""
    payload = verify_token(token)
    if payload and payload.get("type") == "refresh":
        return payload
    return None


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
    """Default dev user hash. Override DEFAULT_USER_PASSWORD in production."""
    default_pw = os.environ.get("DEFAULT_USER_PASSWORD", "")
    if not default_pw:
        import logging as _logging
        _logging.getLogger(__name__).warning(
            "DEFAULT_USER_PASSWORD is not set. Default dev login is disabled. "
            "Set DEFAULT_USER_PASSWORD env var or register a user via /api/v1/auth/register."
        )
        # Return a hash that will never match any password input
        return pwd_context.hash(secrets.token_urlsafe(32))
    return pwd_context.hash(default_pw)


def authenticate_user(username: str, password: str) -> Optional[dict]:
    """Authenticate user against DB or dev fallback."""
    from cohort_lens.data.users import get_user_by_username, update_last_login

    # 1. Try DB-backed user lookup
    user = get_user_by_username(username)
    if user and user.get("is_active", True):
        hashed = user.get("hashed_password")
        if isinstance(hashed, str):
            try:
                if verify_password(password, hashed):
                    update_last_login(username)
                    return user
            except Exception:
                pass  # Fall through to dev fallback

    # 2. Dev fallback — only active when DEFAULT_USER_PASSWORD is explicitly set
    default_user = os.environ.get("DEFAULT_AUTH_USER", "admin")
    default_pw = os.environ.get("DEFAULT_USER_PASSWORD", "")
    if default_pw and username == default_user:
        if verify_password(password, get_default_user_hash()):
            return {"username": username, "tenant_id": username, "is_admin": True}

    return None


def validate_password_strength(password: str) -> Optional[str]:
    """Validate password meets minimum security requirements. Returns error message or None."""
    if len(password) < 8:
        return "Password must be at least 8 characters long"
    if not any(c.isupper() for c in password):
        return "Password must contain at least one uppercase letter"
    if not any(c.islower() for c in password):
        return "Password must contain at least one lowercase letter"
    if not any(c.isdigit() for c in password):
        return "Password must contain at least one digit"
    return None
