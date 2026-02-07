import { unwrap } from './api';

export async function downloadDentalRecordPDF(patientId: string): Promise<void> {
  const result = unwrap(await window.electronAPI.reports.dentalRecord(patientId));
  if (result.filePath) {
    await window.electronAPI.shell.openPath(result.filePath);
  }
}

export async function downloadInvoicePDF(invoiceId: string): Promise<void> {
  const result = unwrap(await window.electronAPI.reports.invoice(invoiceId));
  if (result.filePath) {
    await window.electronAPI.shell.openPath(result.filePath);
  }
}

export async function downloadReceiptPDF(invoiceId: string): Promise<void> {
  const result = unwrap(await window.electronAPI.reports.receipt(invoiceId));
  if (result.filePath) {
    await window.electronAPI.shell.openPath(result.filePath);
  }
}

export async function downloadTreatmentSummaryPDF(
  patientId: string,
  startDate?: string,
  endDate?: string
): Promise<void> {
  const result = unwrap(await window.electronAPI.reports.treatmentSummary(patientId, { startDate, endDate }));
  if (result.filePath) {
    await window.electronAPI.shell.openPath(result.filePath);
  }
}
