from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

# User Schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    role: str = "user"

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Patient Schemas
class PatientBase(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: str
    gender: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    medical_history: Optional[str] = None
    allergies: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class Patient(PatientBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Admission Schemas
class AdmissionBase(BaseModel):
    patient_id: int
    room_id: int
    assigned_doctor_id: Optional[int] = None
    diagnosis: str
    notes: Optional[str] = None

class AdmissionCreate(AdmissionBase):
    pass

class Admission(AdmissionBase):
    id: int
    admission_date: datetime
    discharge_date: Optional[datetime] = None
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Room Schemas
class RoomBase(BaseModel):
    room_number: str
    ward: str
    room_type: str
    capacity: int
    price_per_day: int

class RoomCreate(RoomBase):
    pass

class Room(RoomBase):
    id: int
    is_available: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Medical Record Schemas
class MedicalRecordBase(BaseModel):
    patient_id: int
    admission_id: int
    record_type: str
    description: str
    recorded_by_id: int

class MedicalRecordCreate(MedicalRecordBase):
    pass

class MedicalRecord(MedicalRecordBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Billing Schemas
class BillingBase(BaseModel):
    patient_id: int
    admission_id: int
    amount: int
    description: str
    due_date: datetime

class BillingCreate(BillingBase):
    pass

class Billing(BillingBase):
    id: int
    payment_status: str
    invoice_date: datetime
    paid_date: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Auth Schemas
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class LoginRequest(BaseModel):
    username: str
    password: str
