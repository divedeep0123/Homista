from datetime import datetime, timezone
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import decode_access_token, issue_access_token, verify_firebase_id_token
from app.database import get_db
from app.models import Project, User, UserSession

router = APIRouter(prefix="/v1")
bearer = HTTPBearer(auto_error=False)


class FirebaseLoginRequest(BaseModel):
    id_token: str = Field(min_length=1, max_length=8192)


class UserResponse(BaseModel):
    id: int
    phone_number: Optional[str]
    display_name: Optional[str]


class SessionResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    location: Optional[str] = Field(default=None, max_length=160)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Project name cannot be empty")
        return value

    @field_validator("location")
    @classmethod
    def normalize_location(cls, value: Optional[str]) -> Optional[str]:
        value = value.strip() if value else None
        return value or None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    location: Optional[str]
    created_at: datetime


def current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        claims = decode_access_token(credentials.credentials)
    except (jwt.InvalidTokenError, RuntimeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session") from None
    session = db.get(UserSession, claims["sid"])
    if (
        session is None
        or session.revoked_at is not None
        or (session.expires_at.replace(tzinfo=timezone.utc) if session.expires_at.tzinfo is None else session.expires_at) <= datetime.now(timezone.utc)
        or str(session.user_id) != claims["sub"]
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session is no longer active")
    user = db.get(User, session.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists")
    return user


@router.post("/auth/firebase", response_model=SessionResponse)
def login_with_firebase(payload: FirebaseLoginRequest, db: Session = Depends(get_db)) -> SessionResponse:
    try:
        claims = verify_firebase_id_token(payload.id_token)
    except (ValueError, RuntimeError, firebase_auth.InvalidIdTokenError, firebase_auth.ExpiredIdTokenError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Firebase ID token") from None
    uid = claims.get("uid")
    if not uid or not claims.get("phone_number"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="A verified phone number is required")

    user = db.scalar(select(User).where(User.firebase_uid == uid))
    if user is None:
        user = User(firebase_uid=uid)
        db.add(user)
    user.phone_number = claims.get("phone_number")
    user.display_name = claims.get("name")
    db.flush()

    access_token, session_id, expires_at = issue_access_token(user.id)
    db.add(UserSession(id=session_id, user_id=user.id, expires_at=expires_at))
    db.commit()
    return SessionResponse(
        access_token=access_token,
        expires_in=int((expires_at - datetime.now(timezone.utc)).total_seconds()),
        user=UserResponse(id=user.id, phone_number=user.phone_number, display_name=user.display_name),
    )


@router.get("/users/me", response_model=UserResponse)
def read_current_user(user: User = Depends(current_user)) -> UserResponse:
    return UserResponse(id=user.id, phone_number=user.phone_number, display_name=user.display_name)


@router.get("/projects", response_model=list[ProjectResponse])
def list_projects(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[Project]:
    return list(
        db.scalars(
            select(Project)
            .where(Project.owner_id == user.id)
            .order_by(Project.created_at.desc(), Project.id.desc())
        )
    )


@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> Project:
    project = Project(owner_id=user.id, name=payload.name, location=payload.location)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(user: User = Depends(current_user), credentials: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)) -> None:
    claims = decode_access_token(credentials.credentials)
    session = db.get(UserSession, claims["sid"])
    if session is not None:
        session.revoked_at = datetime.now(timezone.utc)
        db.commit()
