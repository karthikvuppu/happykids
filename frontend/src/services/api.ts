import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { LoginPayload, TokenResponse, RegisterPayload, User } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: (credentials: LoginPayload): Promise<AxiosResponse<TokenResponse>> =>
    api.post('/auth/login', credentials),

  signup: (data: RegisterPayload): Promise<AxiosResponse<User>> =>
    api.post('/auth/signup', data),

  getCurrentUser: (): Promise<AxiosResponse<User>> =>
    api.get('/auth/me'),
};

export const patientService = {
  getAll: () => api.get('/api/v1/patients/'),
  getById: (id: number) => api.get(`/api/v1/patients/${id}`),
  create: (data: any) => api.post('/api/v1/patients/', data),
  update: (id: number, data: any) => api.put(`/api/v1/patients/${id}`, data),
  delete: (id: number) => api.delete(`/api/v1/patients/${id}`),
};

export const admissionService = {
  getAll: () => api.get('/api/v1/admissions/'),
  getById: (id: number) => api.get(`/api/v1/admissions/${id}`),
  create: (data: any) => api.post('/api/v1/admissions/', data),
  update: (id: number, data: any) => api.put(`/api/v1/admissions/${id}`, data),
};

export const roomService = {
  getAll: () => api.get('/api/v1/rooms/'),
  getAvailable: () => api.get('/api/v1/rooms/available/list'),
  getById: (id: number) => api.get(`/api/v1/rooms/${id}`),
  create: (data: any) => api.post('/api/v1/rooms/', data),
};

export default api;
