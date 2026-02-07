import { dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import { prisma } from '../utils/prisma';

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCSV).join(',');
  const dataLines = rows.map(row => row.map(escapeCSV).join(','));
  return [headerLine, ...dataLines].join('\n');
}

async function saveCSV(content: string, defaultName: string): Promise<{ filePath: string | null }> {
  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showSaveDialog(win!, {
    defaultPath: defaultName,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });

  if (result.canceled || !result.filePath) {
    return { filePath: null };
  }

  await fs.promises.writeFile(result.filePath, '\ufeff' + content, 'utf-8'); // BOM for Excel
  return { filePath: result.filePath };
}

export async function exportPatients() {
  const patients = await prisma.patient.findMany({
    where: { isActive: true },
    orderBy: { lastName: 'asc' },
  });

  const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Date of Birth', 'Gender', 'Insurance Provider', 'Created'];
  const rows = patients.map(p => [
    p.firstName,
    p.lastName,
    p.email || '',
    p.phone,
    p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : '',
    p.gender || '',
    p.insuranceProvider || '',
    new Date(p.createdAt).toLocaleDateString(),
  ]);

  return saveCSV(toCSV(headers, rows), `patients-${new Date().toISOString().slice(0, 10)}.csv`);
}

export async function exportAppointments() {
  const appointments = await prisma.appointment.findMany({
    orderBy: { startTime: 'desc' },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      dentist: { select: { firstName: true, lastName: true } },
    },
  });

  const headers = ['Date', 'Start Time', 'End Time', 'Patient', 'Dentist', 'Title', 'Status'];
  const rows = appointments.map(a => [
    new Date(a.startTime).toLocaleDateString(),
    new Date(a.startTime).toLocaleTimeString(),
    new Date(a.endTime).toLocaleTimeString(),
    `${a.patient.firstName} ${a.patient.lastName}`,
    `${a.dentist.firstName} ${a.dentist.lastName}`,
    a.title,
    a.status,
  ]);

  return saveCSV(toCSV(headers, rows), `appointments-${new Date().toISOString().slice(0, 10)}.csv`);
}

export async function exportTreatments() {
  const treatments = await prisma.treatment.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      dentist: { select: { firstName: true, lastName: true } },
    },
  });

  const headers = ['Date', 'Patient', 'Procedure', 'Code', 'Tooth', 'Dentist', 'Status', 'Cost'];
  const rows = treatments.map(t => [
    t.performedAt ? new Date(t.performedAt).toLocaleDateString() : new Date(t.createdAt).toLocaleDateString(),
    `${t.patient.firstName} ${t.patient.lastName}`,
    t.procedureName,
    t.procedureCode || '',
    t.toothNumber?.toString() || '',
    `${t.dentist.firstName} ${t.dentist.lastName}`,
    t.status,
    t.cost.toFixed(2),
  ]);

  return saveCSV(toCSV(headers, rows), `treatments-${new Date().toISOString().slice(0, 10)}.csv`);
}

export async function exportInvoices() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      payments: { select: { amount: true } },
    },
  });

  const headers = ['Invoice #', 'Patient', 'Date', 'Subtotal', 'Tax', 'Discount', 'Total', 'Status', 'Paid', 'Balance'];
  const rows = invoices.map(inv => {
    const paid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = Number(inv.total) - paid;
    return [
      inv.invoiceNumber,
      `${inv.patient.firstName} ${inv.patient.lastName}`,
      new Date(inv.createdAt).toLocaleDateString(),
      Number(inv.subtotal).toFixed(2),
      Number(inv.tax).toFixed(2),
      Number(inv.discount).toFixed(2),
      Number(inv.total).toFixed(2),
      inv.status,
      paid.toFixed(2),
      balance.toFixed(2),
    ];
  });

  return saveCSV(toCSV(headers, rows), `invoices-${new Date().toISOString().slice(0, 10)}.csv`);
}

export async function exportSupplies() {
  const supplies = await prisma.supply.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  const headers = ['Name', 'SKU', 'Category', 'Current Stock', 'Min Stock', 'Unit', 'Cost/Unit', 'Supplier', 'Location'];
  const rows = supplies.map(s => [
    s.name,
    s.sku || '',
    s.category,
    s.currentStock.toString(),
    s.minimumStock.toString(),
    s.unit,
    s.costPerUnit.toFixed(2),
    s.supplier || '',
    s.location || '',
  ]);

  return saveCSV(toCSV(headers, rows), `supplies-${new Date().toISOString().slice(0, 10)}.csv`);
}
