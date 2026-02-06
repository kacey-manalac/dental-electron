import { useState } from 'react';
import { format } from 'date-fns';
import { PlusIcon, MagnifyingGlassIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import * as billingService from '../services/billing';
import { downloadInvoicePDF } from '../services/reports';
import { usePatients } from '../hooks/usePatients';
import { InvoiceStatus, PaymentMethod } from '../types';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Input from '../components/common/Input';
import Select from '../components/common/Select';

const STATUS_COLORS: Record<InvoiceStatus, 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'orange'> = {
  DRAFT: 'gray',
  PENDING: 'blue',
  PAID: 'green',
  PARTIALLY_PAID: 'yellow',
  OVERDUE: 'red',
  CANCELLED: 'gray',
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'DEBIT_CARD', label: 'Debit Card' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
];

export default function BillingPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [invoiceItems, setInvoiceItems] = useState([{ description: '', quantity: 1, unitPrice: 0 }]);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', { page, search }],
    queryFn: () => billingService.getInvoices({ page, limit: 10, search }),
  });

  const { data: patientsData } = usePatients({ limit: 100 });

  // Fetch full invoice details when selected for payment
  const { data: selectedInvoice } = useQuery({
    queryKey: ['invoice', selectedInvoiceId],
    queryFn: () => billingService.getInvoice(selectedInvoiceId!),
    enabled: !!selectedInvoiceId,
  });

  const createInvoice = useMutation({
    mutationFn: billingService.createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice created');
      setShowCreateModal(false);
      setInvoiceItems([{ description: '', quantity: 1, unitPrice: 0 }]);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create invoice');
    },
  });

  const createPayment = useMutation({
    mutationFn: billingService.createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', selectedInvoiceId] });
      toast.success('Payment recorded');
      setShowPaymentModal(false);
      setSelectedInvoiceId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to record payment');
    },
  });

  const handleCreateInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const validItems = invoiceItems.filter(item => item.description && item.unitPrice > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    await createInvoice.mutateAsync({
      patientId: formData.get('patientId') as string,
      items: validItems,
      tax: parseFloat(formData.get('tax') as string) || 0,
      discount: parseFloat(formData.get('discount') as string) || 0,
      dueDate: formData.get('dueDate') as string || undefined,
    });
  };

  const handleCreatePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInvoiceId) return;

    const formData = new FormData(e.currentTarget);

    await createPayment.mutateAsync({
      invoiceId: selectedInvoiceId,
      amount: parseFloat(formData.get('amount') as string),
      method: formData.get('method') as PaymentMethod,
      reference: formData.get('reference') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    });
  };

  const addItem = () => {
    setInvoiceItems([...invoiceItems, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...invoiceItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setInvoiceItems(newItems);
  };

  const subtotal = invoiceItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleDownloadInvoicePDF = async (invoiceId: string) => {
    setIsDownloadingPDF(true);
    try {
      await downloadInvoicePDF(invoiceId);
      toast.success('Invoice PDF downloaded');
    } catch (error: any) {
      toast.error(error.message || 'Failed to download invoice');
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Billing</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* Search */}
      <Card>
        <div className="flex items-center">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 mr-3" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="flex-1 border-0 focus:ring-0 text-gray-900 dark:text-white dark:bg-gray-800 placeholder-gray-400"
          />
        </div>
      </Card>

      {/* Invoices List */}
      <Card>
        {isLoading ? (
          <LoadingSpinner className="py-12" />
        ) : data?.data.length === 0 ? (
          <EmptyState
            title="No invoices found"
            description={search ? 'Try adjusting your search' : 'Get started by creating an invoice'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data?.data.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {invoice.invoiceNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {invoice.patient?.firstName} {invoice.patient?.lastName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={STATUS_COLORS[invoice.status]}>
                          {invoice.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        ${Number(invoice.total).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {invoice.status === 'PAID' ? (
                          <span className="text-green-600 dark:text-green-400">Paid</span>
                        ) : invoice.status === 'CANCELLED' ? (
                          <span className="text-gray-400">-</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            ${Number(invoice.balance ?? invoice.total).toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedInvoiceId(invoice.id);
                            setShowDetailsModal(true);
                          }}
                        >
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadInvoicePDF(invoice.id)}
                          disabled={isDownloadingPDF}
                          title="Download PDF"
                        >
                          <DocumentArrowDownIcon className="h-4 w-4" />
                        </Button>
                        {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedInvoiceId(invoice.id);
                              setShowPaymentModal(true);
                            }}
                          >
                            Add Payment
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3 mt-4">
                <div className="text-sm text-gray-500">
                  Page {page} of {data.pagination.totalPages}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === data.pagination.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Create Invoice Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Invoice"
        size="lg"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          <Select
            label="Patient"
            name="patientId"
            required
            options={patientsData?.data.map((p) => ({
              value: p.id,
              label: `${p.firstName} ${p.lastName}`,
            })) || []}
          />

          <div>
            <label className="label">Items</label>
            <div className="space-y-2">
              {invoiceItems.map((item, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="input flex-1"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    className="input w-20"
                    min="1"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={item.unitPrice || ''}
                    onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="input w-24"
                    step="0.01"
                    min="0"
                  />
                  {invoiceItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={addItem} className="mt-2">
              + Add Item
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input label="Tax" name="tax" type="number" step="0.01" min="0" defaultValue="0" />
            <Input label="Discount" name="discount" type="number" step="0.01" min="0" defaultValue="0" />
            <Input label="Due Date" name="dueDate" type="date" />
          </div>

          <div className="text-right text-lg font-semibold">
            Subtotal: ${subtotal.toFixed(2)}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createInvoice.isPending}>
              Create Invoice
            </Button>
          </div>
        </form>
      </Modal>

      {/* Invoice Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedInvoiceId(null);
        }}
        title="Invoice Details"
        size="lg"
      >
        {selectedInvoice && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedInvoice.invoiceNumber}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedInvoice.patient?.firstName} {selectedInvoice.patient?.lastName}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Created: {format(new Date(selectedInvoice.createdAt), 'MMM d, yyyy')}
                  {selectedInvoice.dueDate && (
                    <span className="ml-3">
                      Due: {format(new Date(selectedInvoice.dueDate), 'MMM d, yyyy')}
                    </span>
                  )}
                </p>
              </div>
              <Badge variant={STATUS_COLORS[selectedInvoice.status]} size="md">
                {selectedInvoice.status.replace('_', ' ')}
              </Badge>
            </div>

            {/* Items */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Items</h4>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {selectedInvoice.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.description}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 text-right">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 text-right">${Number(item.unitPrice).toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white text-right">${Number(item.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal:</span>
                  <span className="text-gray-900 dark:text-white">${Number(selectedInvoice.subtotal).toFixed(2)}</span>
                </div>
                {Number(selectedInvoice.tax) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tax:</span>
                    <span className="text-gray-900 dark:text-white">${Number(selectedInvoice.tax).toFixed(2)}</span>
                  </div>
                )}
                {Number(selectedInvoice.discount) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Discount:</span>
                    <span className="text-green-600">-${Number(selectedInvoice.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 font-medium">
                  <span className="text-gray-700 dark:text-gray-300">Total:</span>
                  <span className="text-gray-900 dark:text-white">${Number(selectedInvoice.total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Paid:</span>
                  <span className="text-green-600">${Number(selectedInvoice.paidAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 font-bold text-lg">
                  <span className="text-gray-700 dark:text-gray-300">Balance Due:</span>
                  <span className={Number(selectedInvoice.balance || selectedInvoice.total) > 0 ? 'text-red-600' : 'text-green-600'}>
                    ${Number(selectedInvoice.balance ?? selectedInvoice.total).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment History */}
            {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment History</h4>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {selectedInvoice.payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                            {format(new Date(payment.paidAt), 'MMM d, yyyy')}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">{payment.method.replace('_', ' ')}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{payment.reference || '-'}</td>
                          <td className="px-4 py-2 text-sm text-green-600 text-right font-medium">
                            ${Number(payment.amount).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button variant="secondary" onClick={() => {
                setShowDetailsModal(false);
                setSelectedInvoiceId(null);
              }}>
                Close
              </Button>
              {selectedInvoice.status !== 'PAID' && selectedInvoice.status !== 'CANCELLED' && (
                <Button onClick={() => {
                  setShowDetailsModal(false);
                  setShowPaymentModal(true);
                }}>
                  Add Payment
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedInvoiceId(null);
        }}
        title="Add Payment"
        size="md"
      >
        {selectedInvoice && (
          <form onSubmit={handleCreatePayment} className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Invoice:</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Patient:</span>
                <span className="text-gray-900 dark:text-white">
                  {selectedInvoice.patient?.firstName} {selectedInvoice.patient?.lastName}
                </span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total Amount:</span>
                  <span className="text-gray-900 dark:text-white">${Number(selectedInvoice.total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Paid Amount:</span>
                  <span className="text-green-600 dark:text-green-400">${Number(selectedInvoice.paidAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600 mt-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Remaining Balance:</span>
                  <span className="text-lg font-bold text-red-600 dark:text-red-400">
                    ${Number(selectedInvoice.balance || selectedInvoice.total).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <Input
              label="Payment Amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={Number(selectedInvoice.balance || selectedInvoice.total)}
              defaultValue={Number(selectedInvoice.balance || selectedInvoice.total).toFixed(2)}
              required
            />

            <Select
              label="Payment Method"
              name="method"
              required
              options={PAYMENT_METHODS}
            />

            <Input label="Reference" name="reference" placeholder="Transaction ID, check number, etc." />

            <div>
              <label className="label">Notes</label>
              <textarea name="notes" rows={2} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100" />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => {
                setShowPaymentModal(false);
                setSelectedInvoiceId(null);
              }}>
                Cancel
              </Button>
              <Button type="submit" loading={createPayment.isPending}>
                Record Payment
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
