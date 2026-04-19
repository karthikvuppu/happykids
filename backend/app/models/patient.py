from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Enum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="user")  # admin, doctor, nurse, staff
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, index=True)
    last_name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    date_of_birth = Column(DateTime)
    gender = Column(String)  # M, F, Other
    address = Column(Text)
    city = Column(String)
    state = Column(String)
    postal_code = Column(String)
    emergency_contact = Column(String)
    emergency_phone = Column(String)
    medical_history = Column(Text)
    allergies = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Staff(Base):
    __tablename__ = "staff"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    specialization = Column(String)  # Doctor, Nurse, Technician
    license_number = Column(String, unique=True)
    department = Column(String)
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Room(Base):
    __tablename__ = "rooms"
    
    id = Column(Integer, primary_key=True, index=True)
    room_number = Column(String, unique=True, index=True)
    ward = Column(String)  # ICU, General, Maternity, etc.
    room_type = Column(String)  # Single, Double, Ward
    capacity = Column(Integer)
    is_available = Column(Boolean, default=True)
    price_per_day = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

class Admission(Base):
    __tablename__ = "admissions"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    room_id = Column(Integer, ForeignKey("rooms.id"))
    assigned_doctor_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    admission_date = Column(DateTime, default=datetime.utcnow)
    discharge_date = Column(DateTime, nullable=True)
    diagnosis = Column(Text)
    notes = Column(Text)
    status = Column(String, default="admitted")  # admitted, discharged, transferred
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MedicalRecord(Base):
    __tablename__ = "medical_records"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    admission_id = Column(Integer, ForeignKey("admissions.id"))
    record_type = Column(String)  # diagnosis, prescription, lab_result
    description = Column(Text)
    recorded_by_id = Column(Integer, ForeignKey("staff.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

class Billing(Base):
    __tablename__ = "billing"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    admission_id = Column(Integer, ForeignKey("admissions.id"))
    amount = Column(Integer)
    description = Column(Text)
    payment_status = Column(String, default="pending")  # pending, paid, partial
    invoice_date = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime)
    paid_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
