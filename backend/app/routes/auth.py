from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

from app.database import get_db
from app.models.user import User
from app.schemas.schemas import UserCreate, User as UserSchema, LoginRequest, TokenResponse
from app.core.security import (
    get_password_hash, 
    verify_password, 
    create_access_token,
    get_current_user
)
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=UserSchema)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    """Create a new user account"""
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=TokenResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """Login user and return JWT token"""
    user = db.query(User).filter(User.username == credentials.username).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, 
        expires_delta=access_token_expires
    )
    return {"access_token": access_token}

@router.put("/change-password")
async def change_password(
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
    passwords: dict = None
):
    """Change user password"""
    user = db.query(User).filter(User.id == int(current_user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(passwords.get("old_password", ""), user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.hashed_password = get_password_hash(passwords["new_password"])
    db.commit()
    return {"message": "Password changed successfully"}

@router.get("/me", response_model=UserSchema)
async def get_current_user_info(
    current_user_id: str = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Get current user information"""
    user = db.query(User).filter(User.id == int(current_user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
