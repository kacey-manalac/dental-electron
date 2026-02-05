import { unwrap } from './api';
import { Patient, MedicalHistory, PaginatedResponse } from '../types';

interface PatientFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface CreatePatientData {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  dateOfBirth: string;
  gender?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  notes?: string;
}

export async function getPatients(filters: PatientFilters = {}): Promise<PaginatedResponse<Patient>> {
  return unwrap(await window.electronAPI.patients.list(filters));
}

export async function getPatient(id: string): Promise<Patient> {
  return unwrap(await window.electronAPI.patients.get(id));
}

export async function createPatient(data: CreatePatientData): Promise<Patient> {
  return unwrap(await window.electronAPI.patients.create(data));
}

export async function updatePatient(id: string, data: Partial<CreatePatientData>): Promise<Patient> {
  return unwrap(await window.electronAPI.patients.update(id, data));
}

export async function deletePatient(id: string): Promise<void> {
  unwrap(await window.electronAPI.patients.delete(id));
}

export async function updateMedicalHistory(patientId: string, data: Partial<MedicalHistory>): Promise<MedicalHistory> {
  return unwrap(await window.electronAPI.patients.updateMedicalHistory(patientId, data));
}
