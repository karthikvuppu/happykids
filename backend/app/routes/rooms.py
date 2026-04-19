from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.patient import Room
from app.schemas.schemas import (
    Room as RoomSchema,
    RoomCreate,
)
from app.core.security import get_current_user

router = APIRouter(prefix="/rooms", tags=["rooms"])

@router.get("/", response_model=List[RoomSchema])
def get_rooms(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Get all rooms"""
    return db.query(Room).all()

@router.post("/", response_model=RoomSchema)
def create_room(room: RoomCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Create a new room"""
    db_room = Room(**room.dict())
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room

@router.get("/{room_id}", response_model=RoomSchema)
def get_room(room_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Get room by ID"""
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room

@router.get("/available/list")
def get_available_rooms(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Get all available rooms"""
    rooms = db.query(Room).filter(Room.is_available == True).all()
    return rooms
