import { unwrap } from './api';

export async function exportPatients(): Promise<{ filePath: string | null }> {
  return unwrap(await window.electronAPI.exports.patients());
}

export async function exportAppointments(): Promise<{ filePath: string | null }> {
  return unwrap(await window.electronAPI.exports.appointments());
}

export async function exportTreatments(): Promise<{ filePath: string | null }> {
  return unwrap(await window.electronAPI.exports.treatments());
}

export async function exportInvoices(): Promise<{ filePath: string | null }> {
  return unwrap(await window.electronAPI.exports.invoices());
}

export async function exportSupplies(): Promise<{ filePath: string | null }> {
  return unwrap(await window.electronAPI.exports.supplies());
}
