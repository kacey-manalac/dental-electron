import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { getPaginationParams, createPaginatedResponse, generateInvoiceNumber } from '../utils/helpers';

const invoiceItemSchema = z.object({
  treatmentId: z.string().uuid().optional().nullable(),
  description: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0),
});

const createInvoiceSchema = z.object({
  patientId: z.string().uuid(),
  items: z.array(invoiceItemSchema).min(1),
  tax: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  dueDate: z.string().transform(str => str ? new Date(str) : null).optional().nullable(),
  notes: z.string().optional().nullable(),
});

const paymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().min(0.01),
  method: z.enum(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'INSURANCE', 'BANK_TRANSFER']),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function getInvoices(filters: {
  page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string;
  patientId?: string; status?: string;
}) {
  const { page, limit, search, sortBy, sortOrder } = getPaginationParams(filters);
  const skip = (page - 1) * limit;

  const where: any = {};

  if (filters.patientId) where.patientId = filters.patientId;
  if (filters.status) where.status = filters.status;

  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: 'insensitive' } },
      { patient: { firstName: { contains: search, mode: 'insensitive' } } },
      { patient: { lastName: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
        payments: {
          select: { amount: true },
        },
        _count: {
          select: { items: true, payments: true },
        },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  const invoicesWithBalance = invoices.map((invoice) => {
    const paidAmount = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = Number(invoice.total) - paidAmount;
    return { ...invoice, paidAmount, balance };
  });

  return createPaginatedResponse(invoicesWithBalance, total, page, limit);
}

export async function getInvoice(id: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true, phone: true, email: true, address: true },
      },
      items: {
        include: {
          treatment: {
            select: { id: true, procedureName: true, toothNumber: true },
          },
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

  const paidAmount = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = Number(invoice.total) - paidAmount;

  return { ...invoice, paidAmount, balance };
}

export async function createInvoice(data: unknown) {
  const parsed = createInvoiceSchema.parse(data);

  const subtotal = parsed.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const total = subtotal + parsed.tax - parsed.discount;

  const invoice = await prisma.invoice.create({
    data: {
      patientId: parsed.patientId,
      invoiceNumber: generateInvoiceNumber(),
      subtotal,
      tax: parsed.tax,
      discount: parsed.discount,
      total,
      dueDate: parsed.dueDate,
      notes: parsed.notes,
      status: 'PENDING',
      items: {
        create: parsed.items.map(item => ({
          treatmentId: item.treatmentId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.unitPrice * item.quantity,
        })),
      },
    },
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true },
      },
      items: true,
    },
  });

  return invoice;
}

export async function updateInvoice(id: string, data: { status?: string; dueDate?: string; notes?: string; tax?: number; discount?: number }) {
  const existing = await prisma.invoice.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Invoice not found');
  }

  if (existing.status === 'PAID') {
    throw new Error('Cannot modify a paid invoice');
  }

  const updateData: any = {};
  if (data.status) updateData.status = data.status;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.tax !== undefined) {
    updateData.tax = data.tax;
    updateData.total = Number(existing.subtotal) + data.tax - Number(existing.discount);
  }
  if (data.discount !== undefined) {
    updateData.discount = data.discount;
    updateData.total = Number(existing.subtotal) + Number(existing.tax) - data.discount;
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data: updateData,
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true },
      },
      items: true,
    },
  });

  return invoice;
}

export async function getPayments(filters: {
  page?: number; limit?: number; sortBy?: string; sortOrder?: string;
  invoiceId?: string; method?: string;
}) {
  const { page, limit, sortBy, sortOrder } = getPaginationParams(filters);
  const skip = (page - 1) * limit;

  const where: any = {};
  if (filters.invoiceId) where.invoiceId = filters.invoiceId;
  if (filters.method) where.method = filters.method;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy === 'createdAt' ? 'paidAt' : sortBy]: sortOrder },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            patient: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  return createPaginatedResponse(payments, total, page, limit);
}

export async function createPayment(data: unknown) {
  const parsed = paymentSchema.parse(data);

  const invoice = await prisma.invoice.findUnique({
    where: { id: parsed.invoiceId },
    include: { payments: true },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  if (invoice.status === 'PAID') {
    throw new Error('Invoice is already fully paid');
  }

  if (invoice.status === 'CANCELLED') {
    throw new Error('Cannot add payment to cancelled invoice');
  }

  const paidAmount = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balance = Number(invoice.total) - paidAmount;

  if (parsed.amount > balance) {
    throw new Error(`Payment amount exceeds balance of ${balance.toFixed(2)}`);
  }

  const payment = await prisma.payment.create({
    data: {
      invoiceId: parsed.invoiceId,
      amount: parsed.amount,
      method: parsed.method,
      reference: parsed.reference,
      notes: parsed.notes,
    },
    include: {
      invoice: {
        select: { id: true, invoiceNumber: true },
      },
    },
  });

  const newPaidAmount = paidAmount + parsed.amount;
  const newStatus = newPaidAmount >= Number(invoice.total) ? 'PAID' : 'PARTIALLY_PAID';

  await prisma.invoice.update({
    where: { id: parsed.invoiceId },
    data: { status: newStatus },
  });

  return payment;
}
