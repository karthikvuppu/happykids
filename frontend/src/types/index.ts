export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  address: string;
  emergency_contact: string;
  medical_history?: string;
  allergies?: string;
}

export interface Admission {
  id: number;
  patient_id: number;
  room_id: number;
  assigned_doctor_id?: number;
  admission_date: string;
  discharge_date?: string;
  diagnosis: string;
  status: string;
}

export interface Room {
  id: number;
  room_number: string;
  ward: string;
  room_type: string;
  capacity: number;
  is_available: boolean;
  price_per_day: number;
}

export interface RegisterPayload {
  username: string;
  email: string;
  full_name: string;
  password: string;
  role: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
