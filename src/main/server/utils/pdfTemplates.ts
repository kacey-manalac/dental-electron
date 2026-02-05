import PDFDocument from 'pdfkit';

interface ClinicInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
}

const CLINIC_INFO: ClinicInfo = {
  name: 'Dental Care Clinic',
  address: '123 Medical Center Drive, Healthcare City, HC 12345',
  phone: '(555) 123-4567',
  email: 'info@dentalcareclinic.com',
};

export function createPDFDocument(): PDFKit.PDFDocument {
  return new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
  });
}

export function addHeader(doc: PDFKit.PDFDocument, title: string): void {
  // Clinic name
  doc.fontSize(20).font('Helvetica-Bold').text(CLINIC_INFO.name, { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(CLINIC_INFO.address, { align: 'center' });
  doc.text(`Phone: ${CLINIC_INFO.phone} | Email: ${CLINIC_INFO.email}`, { align: 'center' });

  // Separator line
  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown();

  // Document title
  doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown();
}

export function addFooter(doc: PDFKit.PDFDocument, pageNumber: number): void {
  const bottom = doc.page.height - 50;
  doc.fontSize(8).font('Helvetica').text(
    `Generated on ${new Date().toLocaleString()} | Page ${pageNumber}`,
    50,
    bottom,
    { align: 'center', width: 495 }
  );
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
