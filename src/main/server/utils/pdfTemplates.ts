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
