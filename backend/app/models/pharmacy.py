from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Float, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Drug(Base):
    __tablename__ = "drugs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    generic_name = Column(String)
    category = Column(String)          # antibiotic, analgesic, vitamin, etc.
    formulation = Column(String)       # tablet, syrup, injection, drops
    strength = Column(String)          # 250mg, 5mg/5ml, etc.
    unit = Column(String)              # tablet, ml, vial
    price_per_unit = Column(Float, default=0.0)
    stock_quantity = Column(Float, default=0.0)
    reorder_level = Column(Float, default=10.0)
    batch_number = Column(String, nullable=True)
    expiry_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    prescription_items = relationship("PrescriptionItem", back_populates="drug")


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    prescribed_by = Column(String)     # doctor name
    diagnosis = Column(Text)
    notes = Column(Text)
    status = Column(String, default="pending")   # pending, partial, dispensed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = relationship("PrescriptionItem", back_populates="prescription", cascade="all, delete-orphan")
    bill = relationship("PharmacyBill", back_populates="prescription", uselist=False)


class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id"), nullable=False)
    drug_id = Column(Integer, ForeignKey("drugs.id"), nullable=False)
    dose = Column(String)              # 5ml, 1 tablet
    frequency = Column(String)         # TID, BD, OD, SOS
    duration_days = Column(Integer)
    quantity_prescribed = Column(Float)
    quantity_dispensed = Column(Float, default=0.0)
    item_status = Column(String, default="pending")   # pending, dispensed

    prescription = relationship("Prescription", back_populates="items")
    drug = relationship("Drug", back_populates="prescription_items")


class PharmacyBill(Base):
    __tablename__ = "pharmacy_bills"

    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    subtotal = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    payment_status = Column(String, default="pending")   # pending, paid
    payment_mode = Column(String)      # cash, card, upi
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    prescription = relationship("Prescription", back_populates="bill")
