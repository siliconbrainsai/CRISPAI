"""
Enterprise Security, Authentication, JWT Token Handling, and RBAC Engine for CRISP AI 3.0
Never stores plaintext passwords. Enforces role-based permissions and multi-tenant isolation.
"""

from typing import List, Optional, Set
from datetime import datetime, timedelta
import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.models.db.entities import User, Workspace

# HTTP Bearer for JWT token extraction
security_bearer = HTTPBearer(auto_error=False)



# --- Roles and Permissions ---
class Role:
    ADMIN = "Admin"
    DATA_SCIENTIST = "Data Scientist"
    ANALYST = "Analyst"
    VIEWER = "Viewer"


class Permission:
    DATASET_UPLOAD = "dataset:upload"
    DATASET_DELETE = "dataset:delete"
    DATASET_VIEW = "dataset:view"
    ANALYSIS_RUN = "analysis:run"
    ANALYSIS_VIEW = "analysis:view"
    REPORT_GENERATE = "report:generate"
    EXPERIMENT_CREATE = "experiment:create"
    AUDIT_VIEW = "audit:view"
    SETTINGS_MANAGE = "settings:manage"


ROLE_PERMISSIONS = {
    Role.ADMIN: {
        Permission.DATASET_UPLOAD, Permission.DATASET_DELETE, Permission.DATASET_VIEW,
        Permission.ANALYSIS_RUN, Permission.ANALYSIS_VIEW, Permission.REPORT_GENERATE,
        Permission.EXPERIMENT_CREATE, Permission.AUDIT_VIEW, Permission.SETTINGS_MANAGE
    },
    Role.DATA_SCIENTIST: {
        Permission.DATASET_UPLOAD, Permission.DATASET_VIEW,
        Permission.ANALYSIS_RUN, Permission.ANALYSIS_VIEW, Permission.REPORT_GENERATE,
        Permission.EXPERIMENT_CREATE, Permission.AUDIT_VIEW
    },
    Role.ANALYST: {
        Permission.DATASET_VIEW,
        Permission.ANALYSIS_RUN, Permission.ANALYSIS_VIEW, Permission.REPORT_GENERATE,
        Permission.EXPERIMENT_CREATE, Permission.AUDIT_VIEW
    },
    Role.VIEWER: {
        Permission.DATASET_VIEW, Permission.ANALYSIS_VIEW, Permission.AUDIT_VIEW
    }
}


def hash_password(password: str) -> str:
    """Hashes password using bcrypt with salt."""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies plaintext password against stored hash."""
    if not hashed_password or not plain_password:
        return False
    pwd_bytes = plain_password.encode("utf-8")[:72]
    try:
        return bcrypt.checkpw(pwd_bytes, hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Encodes JWT access token with expiration claims."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict:
    """Decodes and validates JWT claims."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"}
        )


def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency to extract and authenticate the current user from Bearer token.
    Raises 401 if unauthenticated or token is invalid.
    """
    if not auth or not auth.credentials:
        # Check if running in development mode and an existing admin user exists for seamless local CLI dev,
        # but in API requests without token, raise 401
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    payload = decode_access_token(auth.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject.")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user account.")

    return user


def get_optional_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Extracts user if token is provided, returns None if not provided."""
    if not auth or not auth.credentials:
        return None
    try:
        payload = decode_access_token(auth.credentials)
        user_id = payload.get("sub")
        if user_id:
            return db.query(User).filter(User.id == int(user_id), User.is_active == True).first()
    except Exception:
        return None
    return None


def require_role(allowed_roles: List[str]):
    """RBAC dependency checking that the authenticated user possesses one of the allowed roles."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Role '{current_user.role}' is not authorized for this operation. Allowed: {allowed_roles}"
            )
        return current_user
    return role_checker


def require_permission(permission: str):
    """RBAC dependency checking that user's role has the specified permission."""
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        allowed_perms = ROLE_PERMISSIONS.get(current_user.role, set())
        if permission not in allowed_perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: Missing required permission '{permission}'."
            )
        return current_user
    return permission_checker
