import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export interface ClinicInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  logoFilename?: string;
}

export function createPDFDocument(): PDFKit.PDFDocument {
  return new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
  });
}

export function addHeader(doc: PDFKit.PDFDocument, title: string, clinicInfo: ClinicInfo): void {
  // Logo (if exists)
  if (clinicInfo.logoFilename) {
    const logoPath = path.join(app.getPath('userData'), 'uploads', clinicInfo.logoFilename);
    if (fs.existsSync(logoPath)) {
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      doc.image(logoPath, doc.page.margins.left + (pageWidth - 80) / 2, doc.y, {
        width: 80,
        height: 80,
        fit: [80, 80],
        align: 'center',
      });
      doc.y += 85;
    }
  }

  // Clinic name
  doc.fontSize(20).font('Helvetica-Bold').text(clinicInfo.name, { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(clinicInfo.address, { align: 'center' });
  doc.text(`Phone: ${clinicInfo.phone} | Email: ${clinicInfo.email}`, { align: 'center' });

  // Separator line
  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown();

  // Document title
  doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown();
}

export function addFooter(doc: PDFKit.PDFDocument, pageNumber: number): void {
  // Temporarily remove bottom margin to prevent PDFKit from adding a new page
  const savedBottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  doc.fontSize(8).font('Helvetica').text(
    `Generated on ${new Date().toLocaleString()} | Page ${pageNumber}`,
    50,
    doc.page.height - 30,
    { align: 'center', width: 495, lineBreak: false }
  );
  doc.page.margins.bottom = savedBottomMargin;
}

export function addSection(doc: PDFKit.PDFDocument, title: string): void {
  doc.moveDown();
  doc.fontSize(12).font('Helvetica-Bold').text(title);
  doc.moveTo(50, doc.y).lineTo(200, doc.y).stroke();
  doc.moveDown(0.5);
}

export function addLabelValue(doc: PDFKit.PDFDocument, label: string, value: string | null | undefined): void {
  doc.fontSize(10).font('Helvetica-Bold').text(label + ': ', { continued: true });
  doc.font('Helvetica').text(value || 'N/A');
}

export function addTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: string[][],
  columnWidths: number[]
): void {
  const startX = 50;
  let currentY = doc.y;

  // Draw header row
  doc.font('Helvetica-Bold').fontSize(9);
  let x = startX;
  headers.forEach((header, i) => {
    doc.text(header, x, currentY, { width: columnWidths[i], align: 'left' });
    x += columnWidths[i];
  });

  // Header line
  currentY = doc.y + 5;
  doc.moveTo(startX, currentY).lineTo(startX + columnWidths.reduce((a, b) => a + b, 0), currentY).stroke();
  currentY += 5;

  // Draw rows
  doc.font('Helvetica').fontSize(9);
  rows.forEach(row => {
    // Check if we need a new page
    if (currentY > doc.page.height - 100) {
      doc.addPage();
      currentY = 50;
    }

    x = startX;
    row.forEach((cell, i) => {
      doc.text(cell || '-', x, currentY, { width: columnWidths[i], align: 'left' });
      x += columnWidths[i];
    });
    currentY = doc.y + 3;
  });

  doc.y = currentY;
}

export function formatDate(date: Date | null | undefined): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '$0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}

export function getConditionLabel(condition: string): string {
  const labels: Record<string, string> = {
    HEALTHY: 'Healthy',
    CAVITY: 'Cavity',
    FILLED: 'Filled',
    CROWN: 'Crown',
    MISSING: 'Missing',
    IMPLANT: 'Implant',
    ROOT_CANAL: 'Root Canal',
  };
  return labels[condition] || condition;
}

// ─── Invoice-specific PDF utilities ─────────────────────────────────────────

export const COLORS = {
  primary: '#1e40af',
  primaryDark: '#1e3a8a',
  secondary: '#64748b',
  lightBg: '#f8fafc',
  border: '#e2e8f0',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  white: '#ffffff',
  text: '#1e293b',
  textLight: '#475569',
};

export function addAccentBar(doc: PDFKit.PDFDocument): void {
  doc.save();
  doc.rect(0, 0, doc.page.width, 6).fill(COLORS.primary);
  doc.restore();
}

export function addInvoiceHeader(doc: PDFKit.PDFDocument, clinicInfo: ClinicInfo): number {
  const leftX = doc.page.margins.left;
  const startY = 30;

  // Logo (if exists)
  let logoBottomY = startY;
  if (clinicInfo.logoFilename) {
    const logoPath = path.join(app.getPath('userData'), 'uploads', clinicInfo.logoFilename);
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, leftX, startY, {
        width: 50,
        height: 50,
        fit: [50, 50],
      });
      logoBottomY = startY + 55;
    }
  }

  // Clinic name — next to or below logo
  const textX = clinicInfo.logoFilename ? leftX + 60 : leftX;
  const textY = clinicInfo.logoFilename ? startY + 5 : startY;

  doc.fontSize(16).font('Helvetica-Bold').fillColor(COLORS.primary)
    .text(clinicInfo.name, textX, textY);
  doc.fontSize(9).font('Helvetica').fillColor(COLORS.secondary)
    .text(clinicInfo.address, textX, doc.y + 2)
    .text(`Phone: ${clinicInfo.phone}`, textX)
    .text(clinicInfo.email, textX);

  const headerBottomY = Math.max(doc.y, logoBottomY);

  // Reset fill color
  doc.fillColor(COLORS.text);

  return headerBottomY;
}

export function addInvoiceInfoBox(
  doc: PDFKit.PDFDocument,
  fields: { label: string; value: string }[],
  status?: string,
  startY?: number
): number {
  const boxWidth = 200;
  const rightX = doc.page.width - doc.page.margins.right - boxWidth;
  const y = startY ?? 30;
  const lineHeight = 16;
  const padding = 12;

  // Calculate box height
  const contentHeight = fields.length * lineHeight + (status ? lineHeight + 8 : 0);
  const boxHeight = contentHeight + padding * 2;

  // Draw box background
  doc.save();
  doc.roundedRect(rightX, y, boxWidth, boxHeight, 4)
    .fill(COLORS.lightBg);
  doc.restore();

  // Draw box border
  doc.save();
  doc.roundedRect(rightX, y, boxWidth, boxHeight, 4)
    .strokeColor(COLORS.border).lineWidth(1).stroke();
  doc.restore();

  // Draw fields
  let currentY = y + padding;
  doc.fillColor(COLORS.text);
  fields.forEach(field => {
    doc.fontSize(8).font('Helvetica').fillColor(COLORS.secondary)
      .text(field.label, rightX + padding, currentY, { width: 70 });
    doc.fontSize(9).font('Helvetica-Bold').fillColor(COLORS.text)
      .text(field.value, rightX + padding + 72, currentY, { width: boxWidth - padding * 2 - 72 });
    currentY += lineHeight;
  });

  // Status badge
  if (status) {
    currentY += 4;
    addStatusBadge(doc, status, rightX + padding, currentY);
    currentY += 20;
  }

  doc.fillColor(COLORS.text);
  return y + boxHeight;
}

export function addStatusBadge(doc: PDFKit.PDFDocument, status: string, x: number, y: number): void {
  const statusColors: Record<string, string> = {
    PAID: COLORS.success,
    COMPLETED: COLORS.success,
    PENDING: COLORS.warning,
    PARTIALLY_PAID: COLORS.warning,
    OVERDUE: COLORS.danger,
    CANCELLED: COLORS.danger,
  };

  const color = statusColors[status] || COLORS.secondary;
  const label = status.replace(/_/g, ' ');
  const badgeWidth = doc.fontSize(7).font('Helvetica-Bold').widthOfString(label) + 16;
  const badgeHeight = 16;

  doc.save();
  doc.roundedRect(x, y, badgeWidth, badgeHeight, 8).fill(color);
  doc.fontSize(7).font('Helvetica-Bold').fillColor(COLORS.white)
    .text(label, x, y + 4, { width: badgeWidth, align: 'center' });
  doc.restore();
  doc.fillColor(COLORS.text);
}

export function addBillToSection(doc: PDFKit.PDFDocument, patient: {
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}, label: string = 'BILL TO'): void {
  const leftX = doc.page.margins.left;
  const boxWidth = 250;
  const padding = 12;
  const lineHeight = 15;

  // Count lines
  let lines = 1; // name always present
  if (patient.phone) lines++;
  if (patient.email) lines++;
  if (patient.address) lines++;
  const boxHeight = lines * lineHeight + padding * 2 + 20; // +20 for "BILL TO" label

  // Draw subtle background
  doc.save();
  doc.roundedRect(leftX, doc.y, boxWidth, boxHeight, 4)
    .fill(COLORS.lightBg);
  doc.restore();

  doc.save();
  doc.roundedRect(leftX, doc.y, boxWidth, boxHeight, 4)
    .strokeColor(COLORS.border).lineWidth(1).stroke();
  doc.restore();

  const boxStartY = doc.y;
  let currentY = boxStartY + padding;

  doc.fontSize(7).font('Helvetica-Bold').fillColor(COLORS.secondary)
    .text(label, leftX + padding, currentY);
  currentY += 14;

  // Patient name
  doc.fontSize(11).font('Helvetica-Bold').fillColor(COLORS.text)
    .text(`${patient.firstName} ${patient.lastName}`, leftX + padding, currentY);
  currentY += lineHeight;

  // Contact details
  doc.fontSize(9).font('Helvetica').fillColor(COLORS.textLight);
  if (patient.phone) {
    doc.text(patient.phone, leftX + padding, currentY);
    currentY += lineHeight;
  }
  if (patient.email) {
    doc.text(patient.email, leftX + padding, currentY);
    currentY += lineHeight;
  }
  if (patient.address) {
    doc.text(patient.address, leftX + padding, currentY);
    currentY += lineHeight;
  }

  doc.fillColor(COLORS.text);
  doc.y = boxStartY + boxHeight + 10;
}

export interface ItemsTableOptions {
  rightAlignFrom?: number; // column index from which to right-align (for currency cols)
}

export function addItemsTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: string[][],
  columnWidths: number[],
  options?: ItemsTableOptions
): void {
  const startX = doc.page.margins.left;
  const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
  const cellPadding = 8;
  const rowHeight = 24;
  const rightAlignFrom = options?.rightAlignFrom ?? headers.length; // default: no right-align

  // ── Header row ──
  const headerY = doc.y;
  doc.save();
  doc.roundedRect(startX, headerY, totalWidth, rowHeight, 2).fill(COLORS.primary);
  doc.restore();

  doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.white);
  let x = startX;
  headers.forEach((header, i) => {
    const align = i >= rightAlignFrom ? 'right' : 'left';
    const textX = align === 'right' ? x : x + cellPadding;
    const textWidth = align === 'right' ? columnWidths[i] - cellPadding : columnWidths[i] - cellPadding;
    doc.text(header, textX, headerY + 7, { width: textWidth, align });
    x += columnWidths[i];
  });

  let currentY = headerY + rowHeight;

  // ── Data rows ──
  doc.fillColor(COLORS.text);
  rows.forEach((row, rowIndex) => {
    // Check if we need a new page
    if (currentY > doc.page.height - 100) {
      addFooter(doc, doc.bufferedPageRange().count);
      doc.addPage();
      addAccentBar(doc);
      currentY = doc.page.margins.top;

      // Re-draw header on new page
      doc.save();
      doc.roundedRect(startX, currentY, totalWidth, rowHeight, 2).fill(COLORS.primary);
      doc.restore();
      doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.white);
      let hx = startX;
      headers.forEach((header, i) => {
        const align = i >= rightAlignFrom ? 'right' : 'left';
        const textX = align === 'right' ? hx : hx + cellPadding;
        const textWidth = align === 'right' ? columnWidths[i] - cellPadding : columnWidths[i] - cellPadding;
        doc.text(header, textX, currentY + 7, { width: textWidth, align });
        hx += columnWidths[i];
      });
      currentY += rowHeight;
      doc.fillColor(COLORS.text);
    }

    // Alternating row background
    if (rowIndex % 2 === 1) {
      doc.save();
      doc.rect(startX, currentY, totalWidth, rowHeight).fill(COLORS.lightBg);
      doc.restore();
    }

    // Bottom border
    doc.save();
    doc.moveTo(startX, currentY + rowHeight)
      .lineTo(startX + totalWidth, currentY + rowHeight)
      .strokeColor(COLORS.border).lineWidth(0.5).stroke();
    doc.restore();

    // Cell text
    doc.fontSize(8).font('Helvetica').fillColor(COLORS.text);
    x = startX;
    row.forEach((cell, i) => {
      const align = i >= rightAlignFrom ? 'right' : 'left';
      const textX = align === 'right' ? x : x + cellPadding;
      const textWidth = align === 'right' ? columnWidths[i] - cellPadding : columnWidths[i] - cellPadding;
      doc.text(cell || '-', textX, currentY + 7, { width: textWidth, align });
      x += columnWidths[i];
    });

    currentY += rowHeight;
  });

  doc.y = currentY;
}

export function addTotalsBlock(
  doc: PDFKit.PDFDocument,
  lines: { label: string; value: string; bold?: boolean }[]
): void {
  const blockWidth = 220;
  const rightEdge = doc.page.width - doc.page.margins.right;
  const leftX = rightEdge - blockWidth;
  const lineHeight = 20;
  const padding = 8;

  let currentY = doc.y + 10;

  lines.forEach((line, index) => {
    const isLast = index === lines.length - 1;

    // Highlight the last (total) row
    if (isLast) {
      doc.save();
      // Separator line above total
      doc.moveTo(leftX, currentY)
        .lineTo(rightEdge, currentY)
        .strokeColor(COLORS.primary).lineWidth(1).stroke();
      doc.restore();
      currentY += 4;

      doc.save();
      doc.roundedRect(leftX, currentY, blockWidth, lineHeight + 4, 2).fill(COLORS.primary);
      doc.restore();

      doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.white);
      doc.text(line.label, leftX + padding, currentY + 5, { width: blockWidth / 2 - padding });
      doc.text(line.value, leftX + blockWidth / 2, currentY + 5, {
        width: blockWidth / 2 - padding,
        align: 'right',
      });
      doc.fillColor(COLORS.text);
      currentY += lineHeight + 8;
    } else {
      const fontWeight = line.bold ? 'Helvetica-Bold' : 'Helvetica';
      doc.fontSize(9).font(fontWeight).fillColor(COLORS.text);
      doc.text(line.label, leftX + padding, currentY + 3, { width: blockWidth / 2 - padding });
      doc.text(line.value, leftX + blockWidth / 2, currentY + 3, {
        width: blockWidth / 2 - padding,
        align: 'right',
      });
      currentY += lineHeight;
    }
  });

  doc.y = currentY;
}

export function addNotesBox(doc: PDFKit.PDFDocument, notes: string): void {
  const leftX = doc.page.margins.left;
  const boxWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const padding = 12;

  // Measure text height
  const textHeight = doc.fontSize(9).font('Helvetica').heightOfString(notes, { width: boxWidth - padding * 2 });
  const boxHeight = textHeight + padding * 2 + 18; // +18 for "NOTES" label

  // Check for page break
  if (doc.y + boxHeight > doc.page.height - 60) {
    addFooter(doc, doc.bufferedPageRange().count);
    doc.addPage();
    addAccentBar(doc);
    doc.y = doc.page.margins.top;
  }

  const boxY = doc.y;

  doc.save();
  doc.roundedRect(leftX, boxY, boxWidth, boxHeight, 4).fill(COLORS.lightBg);
  doc.restore();

  doc.save();
  doc.roundedRect(leftX, boxY, boxWidth, boxHeight, 4)
    .strokeColor(COLORS.border).lineWidth(1).stroke();
  doc.restore();

  doc.fontSize(7).font('Helvetica-Bold').fillColor(COLORS.secondary)
    .text('NOTES', leftX + padding, boxY + padding);

  doc.fontSize(9).font('Helvetica').fillColor(COLORS.textLight)
    .text(notes, leftX + padding, boxY + padding + 14, { width: boxWidth - padding * 2 });

  doc.fillColor(COLORS.text);
  doc.y = boxY + boxHeight + 10;
}

export function addInvoiceFooter(doc: PDFKit.PDFDocument, pageNumber: number): void {
  const savedBottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // "Thank you" message
  doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.primary)
    .text('Thank you for your business!', doc.page.margins.left, doc.page.height - 50, {
      width: pageWidth,
      align: 'center',
    });

  // Generated timestamp + page number
  doc.fontSize(7).font('Helvetica').fillColor(COLORS.secondary)
    .text(
      `Generated on ${new Date().toLocaleString()} | Page ${pageNumber}`,
      doc.page.margins.left,
      doc.page.height - 25,
      { width: pageWidth, align: 'center', lineBreak: false }
    );

  doc.fillColor(COLORS.text);
  doc.page.margins.bottom = savedBottomMargin;
}
