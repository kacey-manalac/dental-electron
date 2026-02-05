import { useState } from 'react';
import { format } from 'date-fns';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import {
  useSupplies,
  useSupply,
  useCreateSupply,
  useUpdateSupply,
  useDeleteSupply,
  useRecordUsage,
  useRecordRestock,
  useSupplyDashboardStats,
} from '../hooks/useSupplies';
import { SupplyCategory, Supply } from '../types';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Input from '../components/common/Input';
import Select from '../components/common/Select';

const CATEGORIES: { value: SupplyCategory; label: string }[] = [
  { value: 'DISPOSABLE', label: 'Disposable' },
  { value: 'INSTRUMENT', label: 'Instrument' },
  { value: 'MATERIAL', label: 'Material' },
  { value: 'MEDICATION', label: 'Medication' },
  { value: 'OFFICE', label: 'Office' },
  { value: 'PPE', label: 'PPE' },
  { value: 'OTHER', label: 'Other' },
];

const CATEGORY_COLORS: Record<SupplyCategory, 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'orange' | 'purple'> = {
  DISPOSABLE: 'blue',
  INSTRUMENT: 'purple',
  MATERIAL: 'green',
  MEDICATION: 'red',
  OFFICE: 'gray',
  PPE: 'yellow',
  OTHER: 'gray',
};

function StockLevelBar({ current, minimum }: { current: number; minimum: number }) {
  const ratio = minimum > 0 ? current / minimum : current > 0 ? 2 : 0;
  let color = 'bg-green-500';
  if (ratio <= 1) color = 'bg-red-500';
  else if (ratio <= 2) color = 'bg-yellow-500';

  const width = Math.min(100, (ratio / 3) * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${width}%` }} />
      </div>
      <span className={`text-sm font-medium ${ratio <= 1 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
        {current}
      </span>
    </div>
  );
}

export default function SuppliesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<SupplyCategory | ''>('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedSupplyId, setSelectedSupplyId] = useState<string | null>(null);

  const { data: statsData } = useSupplyDashboardStats();
  const { data, isLoading } = useSupplies({
    page,
    limit: 10,
    search,
    category: categoryFilter || undefined,
    lowStockOnly,
  });
  const { data: selectedSupply } = useSupply(selectedSupplyId || '');

  const createSupply = useCreateSupply();
  const updateSupply = useUpdateSupply();
  const deleteSupply = useDeleteSupply();
  const recordUsage = useRecordUsage();
  const recordRestock = useRecordRestock();

  const handleCreateSupply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    await createSupply.mutateAsync({
      name: formData.get('name') as string,
      category: (formData.get('category') as SupplyCategory) || 'OTHER',
      sku: formData.get('sku') as string || undefined,
      description: formData.get('description') as string || undefined,
      unit: formData.get('unit') as string || 'pcs',
      currentStock: parseInt(formData.get('currentStock') as string) || 0,
      minimumStock: parseInt(formData.get('minimumStock') as string) || 10,
      costPerUnit: parseFloat(formData.get('costPerUnit') as string) || 0,
      supplier: formData.get('supplier') as string || undefined,
      location: formData.get('location') as string || undefined,
      expiryDate: formData.get('expiryDate') as string || undefined,
    });

    setShowCreateModal(false);
  };

  const handleUpdateSupply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSupplyId) return;

    const formData = new FormData(e.currentTarget);

    await updateSupply.mutateAsync({
      id: selectedSupplyId,
      data: {
        name: formData.get('name') as string,
        category: (formData.get('category') as SupplyCategory) || 'OTHER',
        sku: formData.get('sku') as string || undefined,
        description: formData.get('description') as string || undefined,
        unit: formData.get('unit') as string || 'pcs',
        minimumStock: parseInt(formData.get('minimumStock') as string) || 10,
        costPerUnit: parseFloat(formData.get('costPerUnit') as string) || 0,
        supplier: formData.get('supplier') as string || undefined,
        location: formData.get('location') as string || undefined,
        expiryDate: formData.get('expiryDate') as string || undefined,
      },
    });

    setShowEditModal(false);
    setSelectedSupplyId(null);
  };

  const handleRecordUsage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSupplyId) return;

    const formData = new FormData(e.currentTarget);

    await recordUsage.mutateAsync({
      supplyId: selectedSupplyId,
      quantity: parseInt(formData.get('quantity') as string),
      notes: formData.get('notes') as string || undefined,
      reference: formData.get('reference') as string || undefined,
    });

    setShowUsageModal(false);
    setSelectedSupplyId(null);
  };

  const handleRecordRestock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSupplyId) return;

    const formData = new FormData(e.currentTarget);

    await recordRestock.mutateAsync({
      supplyId: selectedSupplyId,
      quantity: parseInt(formData.get('quantity') as string),
      notes: formData.get('notes') as string || undefined,
      reference: formData.get('reference') as string || undefined,
    });

    setShowRestockModal(false);
    setSelectedSupplyId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this supply? This action cannot be undone.')) {
      await deleteSupply.mutateAsync(id);
    }
  };

  const openUsageModal = (supply: Supply) => {
    setSelectedSupplyId(supply.id);
    setShowUsageModal(true);
  };

  const openRestockModal = (supply: Supply) => {
    setSelectedSupplyId(supply.id);
    setShowRestockModal(true);
  };

  const openEditModal = (supply: Supply) => {
    setSelectedSupplyId(supply.id);
    setShowEditModal(true);
  };

  const openDetailModal = (supply: Supply) => {
    setSelectedSupplyId(supply.id);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Supplies Inventory</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Supply
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="!p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Items</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {statsData?.totalItems ?? 0}
          </div>
        </Card>
        <Card className={`!p-4 ${(statsData?.lowStockCount ?? 0) > 0 ? 'border-red-500 border-2' : ''}`}>
          <div className="flex items-center gap-2">
            {(statsData?.lowStockCount ?? 0) > 0 && (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
            )}
            <span className="text-sm text-gray-500 dark:text-gray-400">Low Stock Alerts</span>
          </div>
          <div className={`text-2xl font-bold ${(statsData?.lowStockCount ?? 0) > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
            {statsData?.lowStockCount ?? 0}
          </div>
        </Card>
        <Card className="!p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Inventory Value</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            ${(statsData?.totalValue ?? 0).toFixed(2)}
          </div>
        </Card>
        <Card className="!p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">Categories</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {statsData?.byCategory?.length ?? 0}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex items-center">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 mr-3" />
            <input
              type="text"
              placeholder="Search supplies..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="flex-1 border-0 focus:ring-0 text-gray-900 dark:text-white dark:bg-gray-800 placeholder-gray-400"
            />
          </div>
          <div className="flex items-center gap-4">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value as SupplyCategory | '');
                setPage(1);
              }}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => {
                  setLowStockOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Low Stock Only</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Supplies Table */}
      <Card>
        {isLoading ? (
          <LoadingSpinner className="py-12" />
        ) : data?.data.length === 0 ? (
          <EmptyState
            title="No supplies found"
            description={search || categoryFilter || lowStockOnly ? 'Try adjusting your filters' : 'Get started by adding your first supply'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data?.data.map((supply) => (
                    <tr
                      key={supply.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => openDetailModal(supply)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {supply.name}
                        </div>
                        {supply.description && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">
                            {supply.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {supply.sku || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={CATEGORY_COLORS[supply.category]}>
                          {supply.category}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StockLevelBar current={supply.currentStock} minimum={supply.minimumStock} />
                        <div className="text-xs text-gray-400 mt-1">
                          Min: {supply.minimumStock} {supply.unit}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        ${Number(supply.costPerUnit).toFixed(2)}/{supply.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {supply.supplier || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openUsageModal(supply)}
                            title="Use Stock"
                            disabled={supply.currentStock === 0}
                          >
                            <ArrowUpTrayIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openRestockModal(supply)}
                            title="Restock"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(supply)}
                            title="Edit"
                          >
                            <AdjustmentsHorizontalIcon className="h-4 w-4" />
                          </Button>
                        </div>
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

      {/* Create Supply Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Supply"
        size="lg"
      >
        <form onSubmit={handleCreateSupply} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" name="name" required />
            <Select
              label="Category"
              name="category"
              options={CATEGORIES}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input label="SKU" name="sku" placeholder="Optional" />
            <Input label="Unit" name="unit" defaultValue="pcs" />
            <Input label="Cost Per Unit" name="costPerUnit" type="number" step="0.01" min="0" defaultValue="0" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Initial Stock" name="currentStock" type="number" min="0" defaultValue="0" />
            <Input label="Minimum Stock" name="minimumStock" type="number" min="0" defaultValue="10" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Supplier" name="supplier" placeholder="Optional" />
            <Input label="Location" name="location" placeholder="Optional" />
          </div>

          <Input label="Expiry Date" name="expiryDate" type="date" />

          <div>
            <label className="label">Description</label>
            <textarea
              name="description"
              rows={2}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              placeholder="Optional description..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createSupply.isPending}>
              Add Supply
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Supply Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedSupplyId(null);
        }}
        title="Edit Supply"
        size="lg"
      >
        {selectedSupply && (
          <form onSubmit={handleUpdateSupply} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Name" name="name" defaultValue={selectedSupply.name} required />
              <Select
                label="Category"
                name="category"
                options={CATEGORIES}
                defaultValue={selectedSupply.category}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Input label="SKU" name="sku" defaultValue={selectedSupply.sku || ''} />
              <Input label="Unit" name="unit" defaultValue={selectedSupply.unit} />
              <Input label="Cost Per Unit" name="costPerUnit" type="number" step="0.01" min="0" defaultValue={selectedSupply.costPerUnit} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Current Stock</label>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedSupply.currentStock} {selectedSupply.unit}
                </div>
                <p className="text-xs text-gray-500">Use stock transactions to adjust</p>
              </div>
              <Input label="Minimum Stock" name="minimumStock" type="number" min="0" defaultValue={selectedSupply.minimumStock} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Supplier" name="supplier" defaultValue={selectedSupply.supplier || ''} />
              <Input label="Location" name="location" defaultValue={selectedSupply.location || ''} />
            </div>

            <Input
              label="Expiry Date"
              name="expiryDate"
              type="date"
              defaultValue={selectedSupply.expiryDate ? selectedSupply.expiryDate.split('T')[0] : ''}
            />

            <div>
              <label className="label">Description</label>
              <textarea
                name="description"
                rows={2}
                defaultValue={selectedSupply.description || ''}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  handleDelete(selectedSupply.id);
                  setShowEditModal(false);
                  setSelectedSupplyId(null);
                }}
              >
                Delete
              </Button>
              <div className="flex space-x-3">
                <Button type="button" variant="secondary" onClick={() => {
                  setShowEditModal(false);
                  setSelectedSupplyId(null);
                }}>
                  Cancel
                </Button>
                <Button type="submit" loading={updateSupply.isPending}>
                  Save Changes
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Supply Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedSupplyId(null);
        }}
        title="Supply Details"
        size="lg"
      >
        {selectedSupply && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedSupply.name}
                </h3>
                {selectedSupply.sku && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    SKU: {selectedSupply.sku}
                  </p>
                )}
              </div>
              <Badge variant={CATEGORY_COLORS[selectedSupply.category]} size="md">
                {selectedSupply.category}
              </Badge>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Current Stock</p>
                <p className={`text-lg font-semibold ${selectedSupply.currentStock <= selectedSupply.minimumStock ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                  {selectedSupply.currentStock} {selectedSupply.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Minimum Stock</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedSupply.minimumStock} {selectedSupply.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Cost Per Unit</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  ${Number(selectedSupply.costPerUnit).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  ${(selectedSupply.currentStock * selectedSupply.costPerUnit).toFixed(2)}
                </p>
              </div>
              {selectedSupply.supplier && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Supplier</p>
                  <p className="text-gray-900 dark:text-white">{selectedSupply.supplier}</p>
                </div>
              )}
              {selectedSupply.location && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                  <p className="text-gray-900 dark:text-white">{selectedSupply.location}</p>
                </div>
              )}
              {selectedSupply.expiryDate && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Expiry Date</p>
                  <p className="text-gray-900 dark:text-white">
                    {format(new Date(selectedSupply.expiryDate), 'MMM d, yyyy')}
                  </p>
                </div>
              )}
            </div>

            {selectedSupply.description && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Description</p>
                <p className="text-gray-900 dark:text-white">{selectedSupply.description}</p>
              </div>
            )}

            {/* Transaction History */}
            {selectedSupply.transactions && selectedSupply.transactions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Recent Transactions
                </h4>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {selectedSupply.transactions.map((tx) => (
                        <tr key={tx.id}>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                            {format(new Date(tx.createdAt), 'MMM d, yyyy HH:mm')}
                          </td>
                          <td className="px-4 py-2">
                            <Badge
                              variant={tx.type === 'IN' ? 'green' : tx.type === 'OUT' ? 'red' : 'yellow'}
                              size="sm"
                            >
                              {tx.type}
                            </Badge>
                          </td>
                          <td className={`px-4 py-2 text-sm text-right font-medium ${tx.type === 'IN' ? 'text-green-600' : tx.type === 'OUT' ? 'text-red-600' : 'text-yellow-600'}`}>
                            {tx.type === 'IN' ? '+' : tx.type === 'OUT' ? '-' : ''}{Math.abs(tx.quantity)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500 truncate max-w-xs">
                            {tx.notes || tx.reference || '-'}
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
                setShowDetailModal(false);
                setSelectedSupplyId(null);
              }}>
                Close
              </Button>
              <Button variant="secondary" onClick={() => {
                setShowDetailModal(false);
                openRestockModal(selectedSupply);
              }}>
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Restock
              </Button>
              <Button onClick={() => {
                setShowDetailModal(false);
                openUsageModal(selectedSupply);
              }} disabled={selectedSupply.currentStock === 0}>
                <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                Use Stock
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Use Stock Modal */}
      <Modal
        isOpen={showUsageModal}
        onClose={() => {
          setShowUsageModal(false);
          setSelectedSupplyId(null);
        }}
        title="Record Stock Usage"
        size="md"
      >
        {selectedSupply && (
          <form onSubmit={handleRecordUsage} className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Supply:</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedSupply.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Available Stock:</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedSupply.currentStock} {selectedSupply.unit}
                </span>
              </div>
            </div>

            <Input
              label="Quantity to Use"
              name="quantity"
              type="number"
              min="1"
              max={selectedSupply.currentStock}
              defaultValue="1"
              required
            />

            <Input label="Reference" name="reference" placeholder="e.g., Patient ID, Treatment ID" />

            <div>
              <label className="label">Notes</label>
              <textarea
                name="notes"
                rows={2}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                placeholder="Optional notes..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => {
                setShowUsageModal(false);
                setSelectedSupplyId(null);
              }}>
                Cancel
              </Button>
              <Button type="submit" loading={recordUsage.isPending}>
                Record Usage
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Restock Modal */}
      <Modal
        isOpen={showRestockModal}
        onClose={() => {
          setShowRestockModal(false);
          setSelectedSupplyId(null);
        }}
        title="Record Restock"
        size="md"
      >
        {selectedSupply && (
          <form onSubmit={handleRecordRestock} className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Supply:</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedSupply.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Current Stock:</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedSupply.currentStock} {selectedSupply.unit}
                </span>
              </div>
            </div>

            <Input
              label="Quantity to Add"
              name="quantity"
              type="number"
              min="1"
              defaultValue="1"
              required
            />

            <Input label="Reference" name="reference" placeholder="e.g., PO Number, Invoice #" />

            <div>
              <label className="label">Notes</label>
              <textarea
                name="notes"
                rows={2}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                placeholder="Optional notes..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => {
                setShowRestockModal(false);
                setSelectedSupplyId(null);
              }}>
                Cancel
              </Button>
              <Button type="submit" loading={recordRestock.isPending}>
                Record Restock
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
