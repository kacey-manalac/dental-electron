import { unwrap } from './api';
import { Treatment, PaginatedResponse, TreatmentStatus } from '../types';

interface TreatmentFilters {
  page?: number;
  limit?: number;
  search?: string;
  patientId?: string;
  dentistId?: string;
  status?: TreatmentStatus;
}

interface CreateTreatmentData {
  patientId: string;
  dentistId: string;
  appointmentId?: string;
  toothNumber?: number;
  procedureCode?: string;
  procedureName: string;
  description?: string;
  status?: TreatmentStatus;
  cost: number;
  notes?: string;
  performedAt?: string;
}

export async function getTreatments(filters: TreatmentFilters = {}): Promise<PaginatedResponse<Treatment>> {
  return unwrap(await window.electronAPI.treatments.list(filters));
}

export async function getTreatment(id: string): Promise<Treatment> {
  return unwrap(await window.electronAPI.treatments.get(id));
}

export async function createTreatment(data: CreateTreatmentData): Promise<Treatment> {
  return unwrap(await window.electronAPI.treatments.create(data));
}

export async function updateTreatment(id: string, data: Partial<CreateTreatmentData>): Promise<Treatment> {
  return unwrap(await window.electronAPI.treatments.update(id, data));
}

export async function deleteTreatment(id: string): Promise<void> {
  unwrap(await window.electronAPI.treatments.delete(id));
}
