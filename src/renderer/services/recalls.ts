import { unwrap } from './api';
import { RecallSchedule, RecallType, RecallStatus, PaginatedResponse } from '../types';

interface RecallFilters {
  page?: number;
  limit?: number;
  patientId?: string;
  status?: RecallStatus;
  recallType?: RecallType;
}

interface CreateRecallData {
  patientId: string;
  recallType: RecallType;
  intervalMonths: number;
  lastVisitDate?: string;
  nextDueDate?: string;
  notes?: string;
}

export async function getRecalls(filters: RecallFilters = {}): Promise<PaginatedResponse<RecallSchedule>> {
  return unwrap(await window.electronAPI.recalls.list(filters));
}

export async function createRecall(data: CreateRecallData): Promise<RecallSchedule> {
  return unwrap(await window.electronAPI.recalls.create(data));
}

export async function updateRecall(id: string, data: Partial<CreateRecallData>): Promise<RecallSchedule> {
  return unwrap(await window.electronAPI.recalls.update(id, data));
}

export async function deleteRecall(id: string): Promise<void> {
  unwrap(await window.electronAPI.recalls.delete(id));
}

export async function getDueRecalls(): Promise<RecallSchedule[]> {
  return unwrap(await window.electronAPI.recalls.due());
}
