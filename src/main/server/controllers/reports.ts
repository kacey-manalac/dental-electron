import { dialog, BrowserWindow, shell } from 'electron';
import fs from 'fs';
import { prisma } from '../utils/prisma';
import {
  createPDFDocument,
  addHeader,
  addFooter,
  addSection,
  addLabelValue,
  addTable,
  formatDate,
  formatCurrency,
  getConditionLabel,
} from '../utils/pdfTemplates';
import { getClinicSettings } from './clinicSettings';

function collectPDFToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

export async function generateDentalRecordPDF(patientId: string) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      medicalHistory: true,
      teeth: {
        orderBy: { toothNumber: 'asc' },
        include: {
          surfaces: true,
          conditions: {
            orderBy: { recordedAt: 'desc' },
            take: 3,
          },
        },
      },
    },
  });

  if (!patient) {
    throw new Error('Patient not found');
  }

  const clinicInfo = await getClinicSettings();
  const doc = createPDFDocument();
  const bufferPromise = collectPDFToBuffer(doc);

  addHeader(doc, 'DENTAL RECORD', clinicInfo);

  addSection(doc, 'Patient Information');
  addLabelValue(doc, 'Name', `${patient.firstName} ${patient.lastName}`);
  addLabelValue(doc, 'Date of Birth', formatDate(patient.dateOfBirth));
  addLabelValue(doc, 'Gender', patient.gender);
  addLabelValue(doc, 'Phone', patient.phone);
  addLabelValue(doc, 'Email', patient.email);
  addLabelValue(doc, 'Address', patient.address);

  if (patient.emergencyContact) {
    doc.moveDown(0.5);
    addLabelValue(doc, 'Emergency Contact', patient.emergencyContact);
    addLabelValue(doc, 'Emergency Phone', patient.emergencyPhone);
  }

  if (patient.insuranceProvider) {
    doc.moveDown(0.5);
    addLabelValue(doc, 'Insurance Provider', patient.insuranceProvider);
    addLabelValue(doc, 'Insurance Number', patient.insuranceNumber);
  }

  if (patient.medicalHistory) {
    addSection(doc, 'Medical History');
    addLabelValue(doc, 'Allergies', patient.medicalHistory.allergies);
    addLabelValue(doc, 'Medications', patient.medicalHistory.medications);
    addLabelValue(doc, 'Medical Conditions', patient.medicalHistory.medicalConditions);
    addLabelValue(doc, 'Previous Surgeries', patient.medicalHistory.previousSurgeries);
    addLabelValue(doc, 'Blood Type', patient.medicalHistory.bloodType);
    addLabelValue(doc, 'Smoking Status', patient.medicalHistory.smokingStatus);
    addLabelValue(doc, 'Last Dental Visit', formatDate(patient.medicalHistory.lastDentalVisit));
  }

  addSection(doc, 'Dental Chart');

  const conditionCounts: Record<string, number> = {};
  patient.teeth.forEach(tooth => {
    const condition = tooth.currentCondition;
    conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
  });

  doc.fontSize(10).font('Helvetica');
  Object.entries(conditionCounts).forEach(([condition, count]) => {
    doc.text(`${getConditionLabel(condition)}: ${count} teeth`);
  });

  const affectedTeeth = patient.teeth.filter(t => t.currentCondition !== 'HEALTHY');
  if (affectedTeeth.length > 0) {
    doc.moveDown();
    addTable(
      doc,
      ['Tooth #', 'FDI', 'Condition', 'Notes'],
      affectedTeeth.map(tooth => [
        tooth.toothNumber.toString(),
        tooth.fdiNumber || '-',
        getConditionLabel(tooth.currentCondition),
        tooth.notes || '-',
      ]),
      [60, 60, 120, 255]
    );
  }

  addFooter(doc, 1);
  doc.end();

  const buffer = await bufferPromise;

  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showSaveDialog(win!, {
    defaultPath: `dental-record-${patient.lastName}-${patient.firstName}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });

  if (result.canceled || !result.filePath) {
    return { filePath: null };
  }

  await fs.promises.writeFile(result.filePath, buffer);
  return { filePath: result.filePath };
}

export async function generateInvoicePDF(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      patient: true,
      items: {
        include: {
          treatment: true,
        },
      },
      payments: {
        orderBy: { paidAt: 'desc' },
      },
    },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const clinicInfo = await getClinicSettings();
  const doc = createPDFDocument();
  const bufferPromise = collectPDFToBuffer(doc);

  addHeader(doc, 'INVOICE', clinicInfo);

  doc.fontSize(10).font('Helvetica');
  doc.text(`Invoice Number: ${invoice.invoiceNumber}`, { align: 'right' });
  doc.text(`Date: ${formatDate(invoice.createdAt)}`, { align: 'right' });
  doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, { align: 'right' });
  doc.text(`Status: ${invoice.status}`, { align: 'right' });
  doc.moveDown();

  addSection(doc, 'Bill To');
  addLabelValue(doc, 'Patient', `${invoice.patient.firstName} ${invoice.patient.lastName}`);
  addLabelValue(doc, 'Phone', invoice.patient.phone);
  addLabelValue(doc, 'Email', invoice.patient.email);
  if (invoice.patient.address) {
    addLabelValue(doc, 'Address', invoice.patient.address);
  }

  addSection(doc, 'Services');
  addTable(
    doc,
    ['Description', 'Qty', 'Unit Price', 'Total'],
    invoice.items.map(item => [
      item.description,
      item.quantity.toString(),
      formatCurrency(item.unitPrice),
      formatCurrency(item.total),
    ]),
    [260, 50, 90, 95]
  );

  doc.moveDown();
  const totalsX = 400;
  doc.font('Helvetica').fontSize(10);
  doc.text(`Subtotal:`, totalsX, doc.y, { continued: true, width: 80 });
  doc.text(formatCurrency(invoice.subtotal), { align: 'right', width: 95 });

  if (Number(invoice.discount) > 0) {
    doc.text(`Discount:`, totalsX, doc.y, { continued: true, width: 80 });
    doc.text(`-${formatCurrency(invoice.discount)}`, { align: 'right', width: 95 });
  }

  if (Number(invoice.tax) > 0) {
    doc.text(`Tax:`, totalsX, doc.y, { continued: true, width: 80 });
    doc.text(formatCurrency(invoice.tax), { align: 'right', width: 95 });
  }

  doc.font('Helvetica-Bold');
  doc.text(`Total:`, totalsX, doc.y, { continued: true, width: 80 });
  doc.text(formatCurrency(invoice.total), { align: 'right', width: 95 });

  if (invoice.payments.length > 0) {
    const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = Number(invoice.total) - totalPaid;

    addSection(doc, 'Payment History');
    addTable(
      doc,
      ['Date', 'Method', 'Reference', 'Amount'],
      invoice.payments.map(payment => [
        formatDate(payment.paidAt),
        payment.method.replace('_', ' '),
        payment.reference || '-',
        formatCurrency(payment.amount),
      ]),
      [120, 120, 130, 125]
    );

    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(`Total Paid: ${formatCurrency(totalPaid)}`);
    doc.text(`Balance Due: ${formatCurrency(balance)}`);
  }

  if (invoice.notes) {
    addSection(doc, 'Notes');
    doc.font('Helvetica').fontSize(10).text(invoice.notes);
  }

  addFooter(doc, 1);
  doc.end();

  const buffer = await bufferPromise;

  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showSaveDialog(win!, {
    defaultPath: `invoice-${invoice.invoiceNumber}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });

  if (result.canceled || !result.filePath) {
    return { filePath: null };
  }

  await fs.promises.writeFile(result.filePath, buffer);
  return { filePath: result.filePath };
}

export async function generateTreatmentSummaryPDF(patientId: string, options: { startDate?: string; endDate?: string }) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
  });

  if (!patient) {
    throw new Error('Patient not found');
  }

  const dateFilter: any = {};
  if (options.startDate) {
    dateFilter.gte = new Date(options.startDate);
  }
  if (options.endDate) {
    dateFilter.lte = new Date(options.endDate);
  }

  const treatments = await prisma.treatment.findMany({
    where: {
      patientId,
      ...(options.startDate || options.endDate ? { performedAt: dateFilter } : {}),
    },
    orderBy: { performedAt: 'desc' },
    include: {
      dentist: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  const clinicInfo = await getClinicSettings();
  const doc = createPDFDocument();
  const bufferPromise = collectPDFToBuffer(doc);

  addHeader(doc, 'TREATMENT SUMMARY', clinicInfo);

  addSection(doc, 'Patient Information');
  addLabelValue(doc, 'Name', `${patient.firstName} ${patient.lastName}`);
  addLabelValue(doc, 'Phone', patient.phone);
  if (options.startDate || options.endDate) {
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text('Report Period: ', { continued: true });
    doc.font('Helvetica').text(
      `${options.startDate ? formatDate(new Date(options.startDate)) : 'Beginning'} to ${options.endDate ? formatDate(new Date(options.endDate)) : 'Present'}`
    );
  }

  addSection(doc, 'Treatments');

  if (treatments.length === 0) {
    doc.font('Helvetica').fontSize(10).text('No treatments found for the specified period.');
  } else {
    const totalCost = treatments.reduce((sum, t) => sum + Number(t.cost), 0);
    const completed = treatments.filter(t => t.status === 'COMPLETED').length;

    doc.font('Helvetica').fontSize(10);
    doc.text(`Total Treatments: ${treatments.length}`);
    doc.text(`Completed: ${completed}`);
    doc.text(`Total Cost: ${formatCurrency(totalCost)}`);
    doc.moveDown();

    addTable(
      doc,
      ['Date', 'Procedure', 'Tooth', 'Dentist', 'Status', 'Cost'],
      treatments.map(t => [
        formatDate(t.performedAt),
        t.procedureName,
        t.toothNumber?.toString() || '-',
        `Dr. ${t.dentist.lastName}`,
        t.status,
        formatCurrency(t.cost),
      ]),
      [70, 130, 45, 80, 80, 70]
    );
  }

  addFooter(doc, 1);
  doc.end();

  const buffer = await bufferPromise;

  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showSaveDialog(win!, {
    defaultPath: `treatment-summary-${patient.lastName}-${patient.firstName}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });

  if (result.canceled || !result.filePath) {
    return { filePath: null };
  }

  await fs.promises.writeFile(result.filePath, buffer);
  return { filePath: result.filePath };
}
