"""
Authentication Endpoints for CRISP AI 3.0 Enterprise
Supports registration, login with JWT tokens, session verification, and logout audit tracking.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import (
    hash_password, verify_password, create_access_token,
    get_current_user, Role
)
from app.models.db.entities import User, Workspace, AuditLog
from app.schemas.domain import UserLogin, UserRegister, TokenResponse, User as UserSchema

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
def register_user(data: UserRegister, db: Session = Depends(get_db)):
    """Registers a new user and assigns or creates their enterprise workspace."""
    # Check if user already exists
    existing = db.query(User).filter(User.email == data.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{data.email}' already exists."
        )

    # Resolve Workspace
    workspace_id = data.workspace_id
    if not workspace_id:
        ws_name = data.workspace_name or f"{data.name.split()[0]}'s Workspace"
        workspace = Workspace(name=ws_name)
        db.add(workspace)
        db.commit()
        db.refresh(workspace)
        workspace_id = workspace.id
    else:
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not workspace:
            raise HTTPException(status_code=404, detail="Specified workspace not found.")

    # Validate role
    role = data.role if data.role in [Role.ADMIN, Role.DATA_SCIENTIST, Role.ANALYST, Role.VIEWER] else Role.ANALYST

    new_user = User(
        email=data.email.lower().strip(),
        name=data.name.strip(),
        password_hash=hash_password(data.password),
        role=role,
        workspace_id=workspace_id,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Audit log
    audit = AuditLog(
        workspace_id=workspace_id,
        user_id=new_user.id,
        action="USER_REGISTERED",
        resource="user",
        resource_id=str(new_user.id),
        status="SUCCESS",
        details=f"User {new_user.email} registered with role {role}."
    )
    db.add(audit)
    db.commit()

    # Create JWT Token
    token = create_access_token(data={
        "sub": str(new_user.id),
        "email": new_user.email,
        "role": new_user.role,
        "workspace_id": new_user.workspace_id
    })

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=new_user.id,
        email=new_user.email,
        name=new_user.name,
        role=new_user.role,
        workspace_id=workspace_id,
        workspace_name=workspace.name
    )


@router.post("/login", response_model=TokenResponse)
def login_user(credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticates user via email and password, returning signed JWT token."""
    email_clean = credentials.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()

    if not user or not verify_password(credentials.password, user.password_hash):
        # Audit failed login attempt if user exists
        if user:
            audit = AuditLog(
                workspace_id=user.workspace_id,
                user_id=user.id,
                action="LOGIN_FAILED",
                resource="auth",
                status="FAILED",
                details=f"Invalid password attempt for {email_clean}."
            )
            db.add(audit)
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact an administrator."
        )

    # Successful login
    token = create_access_token(data={
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "workspace_id": user.workspace_id
    })

    audit = AuditLog(
        workspace_id=user.workspace_id,
        user_id=user.id,
        action="LOGIN_SUCCESS",
        resource="auth",
        status="SUCCESS",
        details=f"User {user.email} logged in successfully."
    )
    db.add(audit)
    db.commit()

    ws_name = user.workspace.name if user.workspace else f"Workspace {user.workspace_id}"

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        workspace_id=user.workspace_id or 1,
        workspace_name=ws_name
    )


@router.post("/logout")
def logout_user(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Logs out user and records audit log."""
    audit = AuditLog(
        workspace_id=current_user.workspace_id,
        user_id=current_user.id,
        action="LOGOUT",
        resource="auth",
        status="SUCCESS",
        details=f"User {current_user.email} logged out."
    )
    db.add(audit)
    db.commit()
    return {"message": "Logged out successfully."}


@router.get("/me")
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Returns profile and active workspace of current authenticated user."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role,
        "workspace_id": current_user.workspace_id,
        "workspace_name": current_user.workspace.name if current_user.workspace else None,
        "created_at": current_user.created_at
    }
