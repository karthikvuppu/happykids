from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.patient import Patient, Admission, MedicalRecord, Billing
from app.schemas.schemas import (
    Patient as PatientSchema,
    PatientCreate,
    Admission as AdmissionSchema,
    AdmissionCreate,
    MedicalRecord as MedicalRecordSchema,
    MedicalRecordCreate,
    Billing as BillingSchema,
    BillingCreate,
)
from app.core.security import get_current_user

router = APIRouter(prefix="/patients", tags=["patients"])

@router.get("/", response_model=List[PatientSchema])
def get_patients(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Get all patients"""
    return db.query(Patient).all()

@router.post("/", response_model=PatientSchema)
def create_patient(patient: PatientCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Create a new patient"""
    db_patient = Patient(**patient.dict())
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

@router.get("/{patient_id}", response_model=PatientSchema)
def get_patient(patient_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Get patient by ID"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.put("/{patient_id}", response_model=PatientSchema)
def update_patient(
    patient_id: int, 
    patient: PatientCreate, 
    db: Session = Depends(get_db), 
    _=Depends(get_current_user)
):
    """Update patient information"""
    db_patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not db_patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    for key, value in patient.dict().items():
        setattr(db_patient, key, value)
    db.commit()
    db.refresh(db_patient)
    return db_patient

@router.delete("/{patient_id}")
def delete_patient(patient_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Delete patient"""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    db.delete(patient)
    db.commit()
    return {"message": "Patient deleted"}
