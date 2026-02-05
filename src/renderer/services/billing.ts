import { unwrap } from './api';
import { Invoice, Payment, PaginatedResponse, InvoiceStatus, PaymentMethod } from '../types';

interface InvoiceFilters {
  page?: number;
  limit?: number;
  search?: string;
  patientId?: string;
  status?: InvoiceStatus;
}

interface InvoiceItem {
  treatmentId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface CreateInvoiceData {
  patientId: string;
  items: InvoiceItem[];
  tax?: number;
  discount?: number;
  dueDate?: string;
  notes?: string;
}

interface CreatePaymentData {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

export async function getInvoices(filters: InvoiceFilters = {}): Promise<PaginatedResponse<Invoice>> {
  return unwrap(await window.electronAPI.billing.getInvoices(filters));
}

export async function getInvoice(id: string): Promise<Invoice> {
  return unwrap(await window.electronAPI.billing.getInvoice(id));
}

export async function createInvoice(data: CreateInvoiceData): Promise<Invoice> {
  return unwrap(await window.electronAPI.billing.createInvoice(data));
}

export async function updateInvoice(id: string, data: Partial<{ status: InvoiceStatus; dueDate: string; notes: string; tax: number; discount: number }>): Promise<Invoice> {
  return unwrap(await window.electronAPI.billing.updateInvoice(id, data));
}

export async function getPayments(filters: { page?: number; limit?: number; invoiceId?: string; method?: PaymentMethod } = {}): Promise<PaginatedResponse<Payment>> {
  return unwrap(await window.electronAPI.billing.getPayments(filters));
}

export async function createPayment(data: CreatePaymentData): Promise<Payment> {
  return unwrap(await window.electronAPI.billing.createPayment(data));
}
