from pydantic import BaseModel, EmailStr

class PatientSchema(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str

class AdmissionSchema(BaseModel):
    patient_id: int
    room_id: int

class RoomSchema(BaseModel):
    room_number: str
    ward: str
