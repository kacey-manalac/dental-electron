import { dialog, BrowserWindow, shell } from 'electron';
import fs from 'fs';
import { prisma } from '../utils/prisma';
import {
  createPDFDocument,
  formatDate,
  formatCurrency,
  getConditionLabel,
  addAccentBar,
  addInvoiceHeader,
  addInvoiceInfoBox,
  addBillToSection,
  addItemsTable,
  addTotalsBlock,
  addNotesBox,
  addInvoiceFooter,
  COLORS,
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

  // 1. Accent bar at top
  addAccentBar(doc);

  // 2. Two-column header: clinic info (left) + record info box (right)
  const headerBottomY = addInvoiceHeader(doc, clinicInfo);

  const infoBoxBottomY = addInvoiceInfoBox(
    doc,
    [
      { label: 'Date', value: formatDate(new Date()) },
      { label: 'Patient', value: `${patient.firstName} ${patient.lastName}` },
      { label: 'DOB', value: formatDate(patient.dateOfBirth) },
    ],
    undefined,
    30
  );

  // Separator line
  const separatorY = Math.max(headerBottomY, infoBoxBottomY) + 10;
  doc.save();
  doc.moveTo(doc.page.margins.left, separatorY)
    .lineTo(doc.page.width - doc.page.margins.right, separatorY)
    .strokeColor(COLORS.border).lineWidth(1).stroke();
  doc.restore();

  // "DENTAL RECORD" title
  doc.y = separatorY + 10;
  const drContentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.fontSize(20).font('Helvetica-Bold').fillColor(COLORS.primary)
    .text('DENTAL RECORD', doc.page.margins.left, doc.y, { width: drContentWidth, align: 'center' });
  doc.fillColor(COLORS.text);
  doc.moveDown(0.8);

  // === Patient Information ===
  doc.fontSize(12).font('Helvetica-Bold').fillColor(COLORS.primary).text('Patient Information', doc.page.margins.left);
  doc.fillColor(COLORS.text);
  doc.moveDown(0.3);

  const cardLeft = doc.page.margins.left;
  const fullWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const padding = 12;
  const lineHeight = 16;
  const labelWidth = 95;
  const colWidth = (fullWidth - padding * 3) / 2;

  const patientLeftFields = [
    { label: 'Full Name', value: `${patient.firstName} ${patient.lastName}` },
    { label: 'Date of Birth', value: formatDate(patient.dateOfBirth) },
    { label: 'Gender', value: patient.gender || 'N/A' },
    { label: 'Phone', value: patient.phone || 'N/A' },
    { label: 'Email', value: patient.email || 'N/A' },
    { label: 'Address', value: patient.address || 'N/A' },
  ];

  const patientRightFields: { label: string; value: string }[] = [];
  if (patient.emergencyContact) {
    patientRightFields.push(
      { label: 'Emergency Contact', value: patient.emergencyContact },
      { label: 'Emergency Phone', value: patient.emergencyPhone || 'N/A' }
    );
  }
  if (patient.insuranceProvider) {
    patientRightFields.push(
      { label: 'Insurance', value: patient.insuranceProvider },
      { label: 'Insurance #', value: patient.insuranceNumber || 'N/A' }
    );
  }

  const patientMaxRows = Math.max(patientLeftFields.length, patientRightFields.length);
  const patientCardHeight = patientMaxRows * lineHeight + padding * 2;

  // Card background + border
  doc.save();
  doc.roundedRect(cardLeft, doc.y, fullWidth, patientCardHeight, 4).fill(COLORS.lightBg);
  doc.restore();
  doc.save();
  doc.roundedRect(cardLeft, doc.y, fullWidth, patientCardHeight, 4)
    .strokeColor(COLORS.border).lineWidth(1).stroke();
  doc.restore();

  const patientCardStartY = doc.y;
  let cy = patientCardStartY + padding;

  // Left column
  patientLeftFields.forEach(({ label, value }) => {
    doc.fontSize(8).font('Helvetica').fillColor(COLORS.secondary)
      .text(label, cardLeft + padding, cy, { width: labelWidth });
    doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.text)
      .text(value, cardLeft + padding + labelWidth, cy, { width: colWidth - labelWidth });
    cy += lineHeight;
  });

  // Right column
  if (patientRightFields.length > 0) {
    cy = patientCardStartY + padding;
    const rightColX = cardLeft + padding + colWidth + padding;
    patientRightFields.forEach(({ label, value }) => {
      doc.fontSize(8).font('Helvetica').fillColor(COLORS.secondary)
        .text(label, rightColX, cy, { width: labelWidth });
      doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.text)
        .text(value, rightColX + labelWidth, cy, { width: colWidth - labelWidth });
      cy += lineHeight;
    });
  }

  doc.y = patientCardStartY + patientCardHeight + 15;
  doc.fillColor(COLORS.text);

  // === Medical History ===
  if (patient.medicalHistory) {
    doc.fontSize(12).font('Helvetica-Bold').fillColor(COLORS.primary).text('Medical History', doc.page.margins.left);
    doc.fillColor(COLORS.text);
    doc.moveDown(0.3);

    const medRows = [
      ['Allergies', patient.medicalHistory.allergies || 'None'],
      ['Medications', patient.medicalHistory.medications || 'None'],
      ['Medical Conditions', patient.medicalHistory.medicalConditions || 'None'],
      ['Previous Surgeries', patient.medicalHistory.previousSurgeries || 'None'],
      ['Blood Type', patient.medicalHistory.bloodType || 'N/A'],
      ['Smoking Status', patient.medicalHistory.smokingStatus || 'N/A'],
      ['Last Dental Visit', formatDate(patient.medicalHistory.lastDentalVisit)],
    ];

    addItemsTable(
      doc,
      ['Category', 'Details'],
      medRows,
      [130, 365]
    );
  }

  // === Dental Chart ===
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica-Bold').fillColor(COLORS.primary).text('Dental Chart', doc.page.margins.left);
  doc.fillColor(COLORS.text);
  doc.moveDown(0.3);

  // Condition summary badges
  const conditionCounts: Record<string, number> = {};
  patient.teeth.forEach(tooth => {
    conditionCounts[tooth.currentCondition] = (conditionCounts[tooth.currentCondition] || 0) + 1;
  });

  const conditionColors: Record<string, string> = {
    HEALTHY: COLORS.success,
    CAVITY: COLORS.danger,
    FILLED: COLORS.primary,
    CROWN: COLORS.warning,
    MISSING: COLORS.secondary,
    IMPLANT: '#7c3aed',
    ROOT_CANAL: COLORS.danger,
  };

  let bX = doc.page.margins.left;
  let bY = doc.y;

  Object.entries(conditionCounts).forEach(([condition, count]) => {
    const label = `${getConditionLabel(condition)}: ${count}`;
    const color = conditionColors[condition] || COLORS.secondary;
    const bWidth = doc.fontSize(7).font('Helvetica-Bold').widthOfString(label) + 16;
    const bHeight = 18;

    // Wrap to next line if badges overflow
    if (bX + bWidth > doc.page.width - doc.page.margins.right) {
      bX = doc.page.margins.left;
      bY += bHeight + 6;
    }

    doc.save();
    doc.roundedRect(bX, bY, bWidth, bHeight, 9).fill(color);
    doc.fontSize(7).font('Helvetica-Bold').fillColor(COLORS.white)
      .text(label, bX, bY + 5, { width: bWidth, align: 'center' });
    doc.restore();

    bX += bWidth + 8;
  });

  doc.y = bY + 28;
  doc.fillColor(COLORS.text);

  // Affected teeth table
  const affectedTeeth = patient.teeth.filter(t => t.currentCondition !== 'HEALTHY');
  if (affectedTeeth.length > 0) {
    doc.moveDown(0.3);
    addItemsTable(
      doc,
      ['Tooth #', 'FDI #', 'Condition', 'Notes'],
      affectedTeeth.map(tooth => [
        tooth.toothNumber.toString(),
        tooth.fdiNumber || '-',
        getConditionLabel(tooth.currentCondition),
        tooth.notes || '-',
      ]),
      [60, 60, 140, 235]
    );
  } else {
    doc.fontSize(9).font('Helvetica').fillColor(COLORS.textLight)
      .text('All teeth are healthy - no conditions to report.');
    doc.fillColor(COLORS.text);
  }

  // Footer
  const savedBottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.fontSize(9).font('Helvetica').fillColor(COLORS.secondary)
    .text('Confidential Patient Record', doc.page.margins.left, doc.page.height - 50, {
      width: pageWidth,
      align: 'center',
    });

  doc.fontSize(7).font('Helvetica').fillColor(COLORS.secondary)
    .text(
      `Generated on ${new Date().toLocaleString()} | Page 1`,
      doc.page.margins.left,
      doc.page.height - 25,
      { width: pageWidth, align: 'center', lineBreak: false }
    );

  doc.fillColor(COLORS.text);
  doc.page.margins.bottom = savedBottomMargin;
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

  // 1. Accent bar at top
  addAccentBar(doc);

  // 2. Two-column header: clinic info (left) + invoice details box (right)
  const headerBottomY = addInvoiceHeader(doc, clinicInfo);

  const infoBoxBottomY = addInvoiceInfoBox(
    doc,
    [
      { label: 'Invoice #', value: invoice.invoiceNumber },
      { label: 'Date', value: formatDate(invoice.createdAt) },
      { label: 'Due Date', value: formatDate(invoice.dueDate) },
    ],
    invoice.status,
    30
  );

  // Separator line below both columns (whichever is taller)
  const separatorY = Math.max(headerBottomY, infoBoxBottomY) + 10;
  doc.save();
  doc.moveTo(doc.page.margins.left, separatorY)
    .lineTo(doc.page.width - doc.page.margins.right, separatorY)
    .strokeColor(COLORS.border).lineWidth(1).stroke();
  doc.restore();

  // "INVOICE" title
  doc.y = separatorY + 10;
  const invContentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.fontSize(20).font('Helvetica-Bold').fillColor(COLORS.primary)
    .text('INVOICE', doc.page.margins.left, doc.y, { width: invContentWidth, align: 'center' });
  doc.fillColor(COLORS.text);
  doc.moveDown(0.8);

  // 3. Bill To section
  addBillToSection(doc, invoice.patient);

  // 4. Services table
  doc.moveDown(0.3);
  addItemsTable(
    doc,
    ['Description', 'Qty', 'Unit Price', 'Total'],
    invoice.items.map(item => [
      item.description,
      item.quantity.toString(),
      formatCurrency(item.unitPrice),
      formatCurrency(item.total),
    ]),
    [250, 60, 95, 90],
    { rightAlignFrom: 2 }
  );

  // 5. Totals block
  const totalsLines: { label: string; value: string; bold?: boolean }[] = [
    { label: 'Subtotal', value: formatCurrency(invoice.subtotal) },
  ];

  if (Number(invoice.discount) > 0) {
    totalsLines.push({ label: 'Discount', value: `-${formatCurrency(invoice.discount)}` });
  }

  if (Number(invoice.tax) > 0) {
    totalsLines.push({ label: 'Tax', value: formatCurrency(invoice.tax) });
  }

  // If there are payments, compute balance
  let totalPaid = 0;
  let balance = Number(invoice.total);
  if (invoice.payments.length > 0) {
    totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    balance = Number(invoice.total) - totalPaid;
  }

  totalsLines.push({ label: 'Total', value: formatCurrency(invoice.total), bold: true });

  addTotalsBlock(doc, totalsLines);

  // Balance due (if payments exist and there's a remaining balance)
  if (invoice.payments.length > 0) {
    doc.moveDown(0.5);
    const balanceLines: { label: string; value: string; bold?: boolean }[] = [
      { label: 'Total Paid', value: formatCurrency(totalPaid) },
      { label: 'Balance Due', value: formatCurrency(balance), bold: true },
    ];
    addTotalsBlock(doc, balanceLines);
  }

  // 6. Payment History table
  if (invoice.payments.length > 0) {
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(COLORS.primary).text('Payment History', doc.page.margins.left);
    doc.fillColor(COLORS.text);
    doc.moveDown(0.3);

    addItemsTable(
      doc,
      ['Date', 'Method', 'Reference', 'Amount'],
      invoice.payments.map(payment => [
        formatDate(payment.paidAt),
        payment.method.replace(/_/g, ' '),
        payment.reference || '-',
        formatCurrency(payment.amount),
      ]),
      [130, 120, 130, 115],
      { rightAlignFrom: 3 }
    );
  }

  // 7. Notes
  if (invoice.notes) {
    doc.moveDown(0.5);
    addNotesBox(doc, invoice.notes);
  }

  // 8. Footer
  addInvoiceFooter(doc, 1);
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

export async function generateReceiptPDF(invoiceId: string) {
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

  if (invoice.status !== 'PAID') {
    throw new Error('Receipts can only be generated for paid invoices');
  }

  const clinicInfo = await getClinicSettings();
  const doc = createPDFDocument();
  const bufferPromise = collectPDFToBuffer(doc);

  // 1. Accent bar at top
  addAccentBar(doc);

  // 2. Two-column header: clinic info (left) + receipt details box (right)
  const headerBottomY = addInvoiceHeader(doc, clinicInfo);

  const receiptNumber = `RCP-${invoice.invoiceNumber}`;
  const lastPayment = invoice.payments[0];

  const infoBoxBottomY = addInvoiceInfoBox(
    doc,
    [
      { label: 'Receipt #', value: receiptNumber },
      { label: 'Date', value: formatDate(lastPayment?.paidAt ?? invoice.updatedAt) },
      { label: 'Payment', value: lastPayment?.method.replace(/_/g, ' ') ?? 'N/A' },
    ],
    'PAID',
    30
  );

  // Separator line below both columns
  const separatorY = Math.max(headerBottomY, infoBoxBottomY) + 10;
  doc.save();
  doc.moveTo(doc.page.margins.left, separatorY)
    .lineTo(doc.page.width - doc.page.margins.right, separatorY)
    .strokeColor(COLORS.border).lineWidth(1).stroke();
  doc.restore();

  // "RECEIPT" title
  doc.y = separatorY + 10;
  const rcpContentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.fontSize(20).font('Helvetica-Bold').fillColor(COLORS.primary)
    .text('RECEIPT', doc.page.margins.left, doc.y, { width: rcpContentWidth, align: 'center' });
  doc.fillColor(COLORS.text);
  doc.moveDown(0.8);

  // 3. Large green "PAID" status badge centered
  const badgeLabel = 'PAID';
  const badgeWidth = doc.fontSize(12).font('Helvetica-Bold').widthOfString(badgeLabel) + 40;
  const badgeHeight = 28;
  const badgeX = (doc.page.width - badgeWidth) / 2;
  const badgeY = doc.y;

  doc.save();
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 14).fill(COLORS.success);
  doc.fontSize(12).font('Helvetica-Bold').fillColor(COLORS.white)
    .text(badgeLabel, badgeX, badgeY + 8, { width: badgeWidth, align: 'center' });
  doc.restore();
  doc.fillColor(COLORS.text);
  doc.y = badgeY + badgeHeight + 15;

  // 4. "Received From" patient info box
  addBillToSection(doc, invoice.patient, 'RECEIVED FROM');

  // 5. Services table
  doc.moveDown(0.3);
  addItemsTable(
    doc,
    ['Description', 'Qty', 'Unit Price', 'Total'],
    invoice.items.map(item => [
      item.description,
      item.quantity.toString(),
      formatCurrency(item.unitPrice),
      formatCurrency(item.total),
    ]),
    [250, 60, 95, 90],
    { rightAlignFrom: 2 }
  );

  // 6. Totals block
  const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const totalsLines: { label: string; value: string; bold?: boolean }[] = [
    { label: 'Subtotal', value: formatCurrency(invoice.subtotal) },
  ];

  if (Number(invoice.discount) > 0) {
    totalsLines.push({ label: 'Discount', value: `-${formatCurrency(invoice.discount)}` });
  }

  if (Number(invoice.tax) > 0) {
    totalsLines.push({ label: 'Tax', value: formatCurrency(invoice.tax) });
  }

  totalsLines.push({ label: 'Total Paid', value: formatCurrency(totalPaid), bold: true });

  addTotalsBlock(doc, totalsLines);

  // 7. Payment details section
  if (invoice.payments.length > 0) {
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(COLORS.primary).text('Payment Details', doc.page.margins.left);
    doc.fillColor(COLORS.text);
    doc.moveDown(0.3);

    addItemsTable(
      doc,
      ['Date', 'Method', 'Reference', 'Amount'],
      invoice.payments.map(payment => [
        formatDate(payment.paidAt),
        payment.method.replace(/_/g, ' '),
        payment.reference || '-',
        formatCurrency(payment.amount),
      ]),
      [130, 120, 130, 115],
      { rightAlignFrom: 3 }
    );
  }

  // 8. Notes
  if (invoice.notes) {
    doc.moveDown(0.5);
    addNotesBox(doc, invoice.notes);
  }

  // 9. Footer
  const savedBottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.success)
    .text('Thank you for your payment!', doc.page.margins.left, doc.page.height - 50, {
      width: pageWidth,
      align: 'center',
    });

  doc.fontSize(7).font('Helvetica').fillColor(COLORS.secondary)
    .text(
      `Generated on ${new Date().toLocaleString()} | Page 1`,
      doc.page.margins.left,
      doc.page.height - 25,
      { width: pageWidth, align: 'center', lineBreak: false }
    );

  doc.fillColor(COLORS.text);
  doc.page.margins.bottom = savedBottomMargin;
  doc.end();

  const buffer = await bufferPromise;

  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showSaveDialog(win!, {
    defaultPath: `receipt-${invoice.invoiceNumber}.pdf`,
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

  // 1. Accent bar at top
  addAccentBar(doc);

  // 2. Two-column header: clinic info (left) + report info box (right)
  const headerBottomY = addInvoiceHeader(doc, clinicInfo);

  const periodLabel = options.startDate || options.endDate
    ? `${options.startDate ? formatDate(new Date(options.startDate)) : 'Beginning'} - ${options.endDate ? formatDate(new Date(options.endDate)) : 'Present'}`
    : 'All Time';

  const infoBoxBottomY = addInvoiceInfoBox(
    doc,
    [
      { label: 'Date', value: formatDate(new Date()) },
      { label: 'Patient', value: `${patient.firstName} ${patient.lastName}` },
      { label: 'Period', value: periodLabel },
    ],
    undefined,
    30
  );

  // Separator line
  const separatorY = Math.max(headerBottomY, infoBoxBottomY) + 10;
  doc.save();
  doc.moveTo(doc.page.margins.left, separatorY)
    .lineTo(doc.page.width - doc.page.margins.right, separatorY)
    .strokeColor(COLORS.border).lineWidth(1).stroke();
  doc.restore();

  // "TREATMENT SUMMARY" title
  doc.y = separatorY + 10;
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.fontSize(20).font('Helvetica-Bold').fillColor(COLORS.primary)
    .text('TREATMENT SUMMARY', doc.page.margins.left, doc.y, { width: contentWidth, align: 'center' });
  doc.fillColor(COLORS.text);
  doc.moveDown(0.8);

  // === Patient Information card ===
  addBillToSection(doc, patient, 'PATIENT INFORMATION');

  // === Summary Statistics ===
  if (treatments.length > 0) {
    const totalCost = treatments.reduce((sum, t) => sum + Number(t.cost), 0);
    const completed = treatments.filter(t => t.status === 'COMPLETED').length;
    const inProgress = treatments.filter(t => t.status === 'IN_PROGRESS').length;
    const planned = treatments.filter(t => t.status === 'PLANNED').length;

    doc.fontSize(12).font('Helvetica-Bold').fillColor(COLORS.primary).text('Summary', doc.page.margins.left);
    doc.fillColor(COLORS.text);
    doc.moveDown(0.3);

    // Stats badges
    const stats = [
      { label: `Total: ${treatments.length}`, color: COLORS.primary },
      { label: `Completed: ${completed}`, color: COLORS.success },
    ];
    if (inProgress > 0) stats.push({ label: `In Progress: ${inProgress}`, color: COLORS.warning });
    if (planned > 0) stats.push({ label: `Planned: ${planned}`, color: COLORS.secondary });
    stats.push({ label: `Cost: ${formatCurrency(totalCost)}`, color: COLORS.primaryDark });

    let bX = doc.page.margins.left;
    let bY = doc.y;

    stats.forEach(({ label, color }) => {
      const bWidth = doc.fontSize(7).font('Helvetica-Bold').widthOfString(label) + 16;
      const bHeight = 18;

      if (bX + bWidth > doc.page.width - doc.page.margins.right) {
        bX = doc.page.margins.left;
        bY += bHeight + 6;
      }

      doc.save();
      doc.roundedRect(bX, bY, bWidth, bHeight, 9).fill(color);
      doc.fontSize(7).font('Helvetica-Bold').fillColor(COLORS.white)
        .text(label, bX, bY + 5, { width: bWidth, align: 'center' });
      doc.restore();

      bX += bWidth + 8;
    });

    doc.y = bY + 28;
    doc.fillColor(COLORS.text);

    // === Treatments Table ===
    doc.moveDown(0.3);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(COLORS.primary).text('Treatments', doc.page.margins.left);
    doc.fillColor(COLORS.text);
    doc.moveDown(0.3);

    addItemsTable(
      doc,
      ['Date', 'Procedure', 'Tooth', 'Dentist', 'Status', 'Cost'],
      treatments.map(t => [
        formatDate(t.performedAt),
        t.procedureName,
        t.toothNumber?.toString() || '-',
        `Dr. ${t.dentist.lastName}`,
        t.status.replace(/_/g, ' '),
        formatCurrency(t.cost),
      ]),
      [80, 120, 40, 80, 80, 95],
      { rightAlignFrom: 5 }
    );

    // Totals block
    const totalsLines: { label: string; value: string; bold?: boolean }[] = [
      { label: 'Treatments', value: treatments.length.toString() },
      { label: 'Completed', value: completed.toString() },
      { label: 'Total Cost', value: formatCurrency(totalCost), bold: true },
    ];

    addTotalsBlock(doc, totalsLines);
  } else {
    doc.fontSize(12).font('Helvetica-Bold').fillColor(COLORS.primary).text('Treatments', doc.page.margins.left);
    doc.fillColor(COLORS.text);
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica').fillColor(COLORS.textLight)
      .text('No treatments found for the specified period.');
    doc.fillColor(COLORS.text);
  }

  // Footer
  const savedBottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.primary)
    .text('Thank you for your business!', doc.page.margins.left, doc.page.height - 50, {
      width: pageWidth,
      align: 'center',
    });

  doc.fontSize(7).font('Helvetica').fillColor(COLORS.secondary)
    .text(
      `Generated on ${new Date().toLocaleString()} | Page 1`,
      doc.page.margins.left,
      doc.page.height - 25,
      { width: pageWidth, align: 'center', lineBreak: false }
    );

  doc.fillColor(COLORS.text);
  doc.page.margins.bottom = savedBottomMargin;
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
