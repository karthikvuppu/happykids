from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.pharmacy import Drug, Prescription, PrescriptionItem, PharmacyBill
from app.models.patient import Patient
from app.core.security import get_current_user

router = APIRouter(prefix="/pharmacy", tags=["pharmacy"])

# ─── Pydantic Schemas ────────────────────────────────────────────────────────

class DrugCreate(BaseModel):
    name: str
    generic_name: Optional[str] = None
    category: Optional[str] = None
    formulation: Optional[str] = None
    strength: Optional[str] = None
    unit: Optional[str] = "tablet"
    price_per_unit: float = 0.0
    stock_quantity: float = 0.0
    reorder_level: float = 10.0
    batch_number: Optional[str] = None
    expiry_date: Optional[datetime] = None

class DrugUpdate(DrugCreate):
    pass

class StockUpdate(BaseModel):
    quantity: float
    operation: str  # "add" or "set"

class PrescriptionItemIn(BaseModel):
    drug_id: int
    dose: Optional[str] = None
    frequency: Optional[str] = None
    duration_days: Optional[int] = None
    quantity_prescribed: float

class PrescriptionCreate(BaseModel):
    patient_id: int
    prescribed_by: Optional[str] = None
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    items: List[PrescriptionItemIn]

class DispenseItem(BaseModel):
    item_id: int
    quantity_dispensed: float

class DispenseRequest(BaseModel):
    items: List[DispenseItem]
    discount: float = 0.0
    payment_mode: Optional[str] = None

class PayBillRequest(BaseModel):
    payment_mode: str

# ─── Drug Master ─────────────────────────────────────────────────────────────

@router.get("/drugs")
def get_drugs(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Drug).filter(Drug.is_active == True).order_by(Drug.name).all()

@router.get("/drugs/low-stock")
def get_low_stock(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(Drug).filter(
        Drug.is_active == True,
        Drug.stock_quantity <= Drug.reorder_level
    ).all()

@router.get("/drugs/expiring")
def get_expiring(days: int = 90, db: Session = Depends(get_db), _=Depends(get_current_user)):
    cutoff = datetime.utcnow() + timedelta(days=days)
    return db.query(Drug).filter(
        Drug.is_active == True,
        Drug.expiry_date != None,
        Drug.expiry_date <= cutoff
    ).order_by(Drug.expiry_date).all()

@router.post("/drugs")
def create_drug(drug: DrugCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    db_drug = Drug(**drug.dict())
    db.add(db_drug)
    db.commit()
    db.refresh(db_drug)
    return db_drug

@router.put("/drugs/{drug_id}")
def update_drug(drug_id: int, drug: DrugUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    db_drug = db.query(Drug).filter(Drug.id == drug_id).first()
    if not db_drug:
        raise HTTPException(404, "Drug not found")
    for k, v in drug.dict().items():
        setattr(db_drug, k, v)
    db_drug.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_drug)
    return db_drug

@router.patch("/drugs/{drug_id}/stock")
def update_stock(drug_id: int, body: StockUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    db_drug = db.query(Drug).filter(Drug.id == drug_id).first()
    if not db_drug:
        raise HTTPException(404, "Drug not found")
    if body.operation == "add":
        db_drug.stock_quantity += body.quantity
    else:
        db_drug.stock_quantity = body.quantity
    db_drug.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_drug)
    return db_drug

@router.delete("/drugs/{drug_id}")
def delete_drug(drug_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    db_drug = db.query(Drug).filter(Drug.id == drug_id).first()
    if not db_drug:
        raise HTTPException(404, "Drug not found")
    db_drug.is_active = False
    db.commit()
    return {"message": "Drug removed"}

# ─── Prescriptions ────────────────────────────────────────────────────────────

@router.get("/prescriptions")
def get_prescriptions(
    patient_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    q = db.query(Prescription).options(
        joinedload(Prescription.items).joinedload(PrescriptionItem.drug),
        joinedload(Prescription.bill)
    )
    if patient_id:
        q = q.filter(Prescription.patient_id == patient_id)
    if status:
        q = q.filter(Prescription.status == status)
    prescriptions = q.order_by(Prescription.created_at.desc()).all()

    result = []
    for p in prescriptions:
        patient = db.query(Patient).filter(Patient.id == p.patient_id).first()
        result.append({
            "id": p.id,
            "patient_id": p.patient_id,
            "patient_name": f"{patient.first_name} {patient.last_name or ''}".strip() if patient else "",
            "prescribed_by": p.prescribed_by,
            "diagnosis": p.diagnosis,
            "notes": p.notes,
            "status": p.status,
            "created_at": p.created_at,
            "items": [{
                "id": item.id,
                "drug_id": item.drug_id,
                "drug_name": item.drug.name if item.drug else "",
                "formulation": item.drug.formulation if item.drug else "",
                "strength": item.drug.strength if item.drug else "",
                "unit": item.drug.unit if item.drug else "",
                "price_per_unit": item.drug.price_per_unit if item.drug else 0,
                "dose": item.dose,
                "frequency": item.frequency,
                "duration_days": item.duration_days,
                "quantity_prescribed": item.quantity_prescribed,
                "quantity_dispensed": item.quantity_dispensed,
                "item_status": item.item_status,
            } for item in p.items],
            "bill": {
                "id": p.bill.id,
                "subtotal": p.bill.subtotal,
                "discount": p.bill.discount,
                "total": p.bill.total,
                "payment_status": p.bill.payment_status,
                "payment_mode": p.bill.payment_mode,
                "paid_at": p.bill.paid_at,
            } if p.bill else None
        })
    return result

@router.post("/prescriptions")
def create_prescription(rx: PrescriptionCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    patient = db.query(Patient).filter(Patient.id == rx.patient_id).first()
    if not patient:
        raise HTTPException(404, "Patient not found")

    prescription = Prescription(
        patient_id=rx.patient_id,
        prescribed_by=rx.prescribed_by,
        diagnosis=rx.diagnosis,
        notes=rx.notes,
        status="pending"
    )
    db.add(prescription)
    db.flush()

    for item in rx.items:
        drug = db.query(Drug).filter(Drug.id == item.drug_id).first()
        if not drug:
            raise HTTPException(404, f"Drug {item.drug_id} not found")
        db_item = PrescriptionItem(
            prescription_id=prescription.id,
            drug_id=item.drug_id,
            dose=item.dose,
            frequency=item.frequency,
            duration_days=item.duration_days,
            quantity_prescribed=item.quantity_prescribed,
        )
        db.add(db_item)

    db.commit()
    db.refresh(prescription)
    return {"id": prescription.id, "status": prescription.status}

@router.post("/prescriptions/{rx_id}/dispense")
def dispense(rx_id: int, body: DispenseRequest, db: Session = Depends(get_db), _=Depends(get_current_user)):
    prescription = db.query(Prescription).options(
        joinedload(Prescription.items).joinedload(PrescriptionItem.drug)
    ).filter(Prescription.id == rx_id).first()
    if not prescription:
        raise HTTPException(404, "Prescription not found")

    subtotal = 0.0
    for d in body.items:
        item = next((i for i in prescription.items if i.id == d.item_id), None)
        if not item:
            continue
        drug = item.drug
        if drug.stock_quantity < d.quantity_dispensed:
            raise HTTPException(400, f"Insufficient stock for {drug.name}. Available: {drug.stock_quantity} {drug.unit}")
        drug.stock_quantity -= d.quantity_dispensed
        drug.updated_at = datetime.utcnow()
        item.quantity_dispensed = d.quantity_dispensed
        item.item_status = "dispensed"
        subtotal += d.quantity_dispensed * drug.price_per_unit

    # update prescription status
    all_dispensed = all(i.item_status == "dispensed" for i in prescription.items)
    any_dispensed = any(i.item_status == "dispensed" for i in prescription.items)
    prescription.status = "dispensed" if all_dispensed else ("partial" if any_dispensed else "pending")
    prescription.updated_at = datetime.utcnow()

    discount = body.discount or 0.0
    total = max(subtotal - discount, 0)

    # create or update bill
    if prescription.bill:
        prescription.bill.subtotal = subtotal
        prescription.bill.discount = discount
        prescription.bill.total = total
    else:
        bill = PharmacyBill(
            prescription_id=prescription.id,
            patient_id=prescription.patient_id,
            subtotal=subtotal,
            discount=discount,
            total=total,
            payment_status="pending",
            payment_mode=body.payment_mode
        )
        db.add(bill)

    db.commit()
    return {"message": "Dispensed successfully", "total": total}

@router.post("/bills/{bill_id}/pay")
def pay_bill(bill_id: int, body: PayBillRequest, db: Session = Depends(get_db), _=Depends(get_current_user)):
    bill = db.query(PharmacyBill).filter(PharmacyBill.id == bill_id).first()
    if not bill:
        raise HTTPException(404, "Bill not found")
    bill.payment_status = "paid"
    bill.payment_mode = body.payment_mode
    bill.paid_at = datetime.utcnow()
    db.commit()
    return {"message": "Payment recorded"}

@router.get("/bills")
def get_bills(
    patient_id: Optional[int] = None,
    payment_status: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    q = db.query(PharmacyBill)
    if patient_id:
        q = q.filter(PharmacyBill.patient_id == patient_id)
    if payment_status:
        q = q.filter(PharmacyBill.payment_status == payment_status)
    return q.order_by(PharmacyBill.created_at.desc()).all()

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), _=Depends(get_current_user)):
    total_drugs = db.query(func.count(Drug.id)).filter(Drug.is_active == True).scalar()
    low_stock = db.query(func.count(Drug.id)).filter(Drug.is_active == True, Drug.stock_quantity <= Drug.reorder_level).scalar()
    pending_rx = db.query(func.count(Prescription.id)).filter(Prescription.status == "pending").scalar()
    pending_bills = db.query(func.count(PharmacyBill.id)).filter(PharmacyBill.payment_status == "pending").scalar()
    pending_revenue = db.query(func.sum(PharmacyBill.total)).filter(PharmacyBill.payment_status == "pending").scalar() or 0
    cutoff = datetime.utcnow() + timedelta(days=90)
    expiring_soon = db.query(func.count(Drug.id)).filter(Drug.is_active == True, Drug.expiry_date != None, Drug.expiry_date <= cutoff).scalar()
    return {
        "total_drugs": total_drugs,
        "low_stock_count": low_stock,
        "pending_prescriptions": pending_rx,
        "pending_bills": pending_bills,
        "pending_revenue": round(pending_revenue, 2),
        "expiring_soon": expiring_soon
    }
