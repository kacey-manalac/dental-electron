import { unwrap } from './api';
import { Appointment, PaginatedResponse, AppointmentStatus } from '../types';

interface AppointmentFilters {
  page?: number;
  limit?: number;
  search?: string;
  patientId?: string;
  dentistId?: string;
  status?: AppointmentStatus;
  startDate?: string;
  endDate?: string;
}

interface CreateAppointmentData {
  patientId: string;
  dentistId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status?: AppointmentStatus;
  notes?: string;
}

export async function getAppointments(filters: AppointmentFilters = {}): Promise<PaginatedResponse<Appointment>> {
  return unwrap(await window.electronAPI.appointments.list(filters));
}

export async function getAppointment(id: string): Promise<Appointment> {
  return unwrap(await window.electronAPI.appointments.get(id));
}

export async function createAppointment(data: CreateAppointmentData): Promise<Appointment> {
  return unwrap(await window.electronAPI.appointments.create(data));
}

export async function updateAppointment(id: string, data: Partial<CreateAppointmentData>): Promise<Appointment> {
  return unwrap(await window.electronAPI.appointments.update(id, data));
}

export async function deleteAppointment(id: string): Promise<void> {
  unwrap(await window.electronAPI.appointments.delete(id));
}
