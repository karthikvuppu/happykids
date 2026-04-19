from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.patient import Admission, Room
from app.schemas.schemas import (
    Admission as AdmissionSchema,
    AdmissionCreate,
    Room as RoomSchema,
)
from app.core.security import get_current_user

router = APIRouter(prefix="/admissions", tags=["admissions"])

@router.get("/", response_model=List[AdmissionSchema])
def get_admissions(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Get all admissions"""
    return db.query(Admission).all()

@router.post("/", response_model=AdmissionSchema)
def create_admission(admission: AdmissionCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Create a new admission"""
    db_admission = Admission(**admission.dict())
    db.add(db_admission)
    db.commit()
    db.refresh(db_admission)
    return db_admission

@router.get("/{admission_id}", response_model=AdmissionSchema)
def get_admission(admission_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Get admission by ID"""
    admission = db.query(Admission).filter(Admission.id == admission_id).first()
    if not admission:
        raise HTTPException(status_code=404, detail="Admission not found")
    return admission

@router.put("/{admission_id}", response_model=AdmissionSchema)
def update_admission(
    admission_id: int, 
    admission: AdmissionCreate, 
    db: Session = Depends(get_db), 
    _=Depends(get_current_user)
):
    """Update admission"""
    db_admission = db.query(Admission).filter(Admission.id == admission_id).first()
    if not db_admission:
        raise HTTPException(status_code=404, detail="Admission not found")
    
    for key, value in admission.dict().items():
        setattr(db_admission, key, value)
    db.commit()
    db.refresh(db_admission)
    return db_admission
