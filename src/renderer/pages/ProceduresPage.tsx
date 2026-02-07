import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  BookOpenIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import {
  useProcedures,
  useCreateProcedure,
  useUpdateProcedure,
  useDeleteProcedure,
  useProcedureSupplies,
  useAddProcedureSupply,
  useRemoveProcedureSupply,
} from '../hooks/useProcedures';
import { ProcedureCatalog, ProcedureCategory } from '../types';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import { unwrap } from '../services/api';

const CATEGORIES: { value: ProcedureCategory; label: string }[] = [
  { value: 'PREVENTIVE', label: 'Preventive' },
  { value: 'RESTORATIVE', label: 'Restorative' },
  { value: 'ENDODONTIC', label: 'Endodontic' },
  { value: 'PROSTHODONTIC', label: 'Prosthodontic' },
  { value: 'ORTHODONTIC', label: 'Orthodontic' },
  { value: 'SURGICAL', label: 'Surgical' },
  { value: 'DIAGNOSTIC', label: 'Diagnostic' },
  { value: 'COSMETIC', label: 'Cosmetic' },
  { value: 'OTHER', label: 'Other' },
];

const CATEGORY_COLORS: Record<ProcedureCategory, 'gray' | 'blue' | 'green' | 'yellow' | 'red' | 'orange' | 'purple'> = {
  PREVENTIVE: 'green',
  RESTORATIVE: 'blue',
  ENDODONTIC: 'red',
  PROSTHODONTIC: 'purple',
  ORTHODONTIC: 'yellow',
  SURGICAL: 'orange',
  DIAGNOSTIC: 'gray',
  COSMETIC: 'blue',
  OTHER: 'gray',
};

export default function ProceduresPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<ProcedureCategory | ''>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<ProcedureCatalog | null>(null);
  const [showAddSupplyForm, setShowAddSupplyForm] = useState(false);

  const { data, isLoading } = useProcedures({
    page,
    limit: 10,
    search,
    category: categoryFilter || undefined,
  });

  const createProcedure = useCreateProcedure();
  const updateProcedure = useUpdateProcedure();
  const deleteProcedure = useDeleteProcedure();
  const addProcedureSupply = useAddProcedureSupply();
  const removeProcedureSupply = useRemoveProcedureSupply();

  const { data: procedureSupplies, isLoading: suppliesLoading } = useProcedureSupplies(
    selectedProcedure?.id || ''
  );

  const { data: allSupplies } = useQuery({
    queryKey: ['supplies', 'all-for-linking'],
    queryFn: async () => unwrap(await window.electronAPI.supplies.list({ limit: 500 })),
    enabled: showDetailModal && showAddSupplyForm,
  });

  const handleCreateProcedure = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    await createProcedure.mutateAsync({
      name: formData.get('name') as string,
      code: (formData.get('code') as string) || undefined,
      description: (formData.get('description') as string) || undefined,
      defaultCost: parseFloat(formData.get('defaultCost') as string) || 0,
      category: (formData.get('category') as ProcedureCategory) || 'OTHER',
      estimatedDuration: parseInt(formData.get('estimatedDuration') as string) || undefined,
    });

    setShowCreateModal(false);
  };

  const handleUpdateProcedure = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProcedure) return;

    const formData = new FormData(e.currentTarget);

    await updateProcedure.mutateAsync({
      id: selectedProcedure.id,
      data: {
        name: formData.get('name') as string,
        code: (formData.get('code') as string) || undefined,
        description: (formData.get('description') as string) || undefined,
        defaultCost: parseFloat(formData.get('defaultCost') as string) || 0,
        category: (formData.get('category') as ProcedureCategory) || 'OTHER',
        estimatedDuration: parseInt(formData.get('estimatedDuration') as string) || undefined,
      },
    });

    setShowEditModal(false);
    setSelectedProcedure(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this procedure? This action cannot be undone.')) {
      await deleteProcedure.mutateAsync(id);
    }
  };

  const handleAddSupply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProcedure) return;

    const formData = new FormData(e.currentTarget);
    const supplyId = formData.get('supplyId') as string;
    const quantityUsed = parseInt(formData.get('quantityUsed') as string) || 1;

    if (!supplyId) return;

    await addProcedureSupply.mutateAsync({
      procedureCatalogId: selectedProcedure.id,
      supplyId,
      quantityUsed,
    });

    setShowAddSupplyForm(false);
  };

  const handleRemoveSupply = async (linkId: string) => {
    if (confirm('Remove this supply from the procedure?')) {
      await removeProcedureSupply.mutateAsync(linkId);
    }
  };

  const openEditModal = (procedure: ProcedureCatalog) => {
    setSelectedProcedure(procedure);
    setShowEditModal(true);
  };

  const openDetailModal = (procedure: ProcedureCatalog) => {
    setSelectedProcedure(procedure);
    setShowAddSupplyForm(false);
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Procedure Catalog</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Procedure
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex items-center">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 mr-3" />
            <input
              type="text"
              placeholder="Search procedures..."
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
                setCategoryFilter(e.target.value as ProcedureCategory | '');
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
          </div>
        </div>
      </Card>

      {/* Procedures Table */}
      <Card>
        {isLoading ? (
          <LoadingSpinner className="py-12" />
        ) : data?.data.length === 0 ? (
          <EmptyState
            title="No procedures found"
            description={search || categoryFilter ? 'Try adjusting your filters' : 'Get started by adding your first procedure'}
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
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supplies
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data?.data.map((procedure) => (
                    <tr
                      key={procedure.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => openDetailModal(procedure)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {procedure.name}
                        </div>
                        {procedure.description && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">
                            {procedure.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {procedure.code || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={CATEGORY_COLORS[procedure.category]}>
                          {procedure.category}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        ${Number(procedure.defaultCost).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {procedure.estimatedDuration ? `${procedure.estimatedDuration} min` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1">
                          <LinkIcon className="h-4 w-4" />
                          {procedure._count?.procedureSupplies ?? 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetailModal(procedure)}
                            title="View Details"
                          >
                            <BookOpenIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(procedure)}
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(procedure.id)}
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4 text-red-500" />
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

      {/* Create Procedure Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Procedure"
        size="lg"
      >
        <form onSubmit={handleCreateProcedure} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" name="name" required />
            <Input label="Code" name="code" placeholder="e.g., D0120" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Default Cost" name="defaultCost" type="number" step="0.01" min="0" required defaultValue="0" />
            <Select
              label="Category"
              name="category"
              options={CATEGORIES}
            />
          </div>

          <Input label="Estimated Duration (minutes)" name="estimatedDuration" type="number" min="0" placeholder="Optional" />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea
              name="description"
              rows={3}
              className="block w-full rounded-lg px-3.5 py-2.5 shadow-sm sm:text-sm bg-white dark:bg-surface-800 dark:text-gray-100 border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600"
              placeholder="Optional description..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createProcedure.isPending}>
              Add Procedure
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Procedure Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedProcedure(null);
        }}
        title="Edit Procedure"
        size="lg"
      >
        {selectedProcedure && (
          <form onSubmit={handleUpdateProcedure} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Name" name="name" defaultValue={selectedProcedure.name} required />
              <Input label="Code" name="code" defaultValue={selectedProcedure.code || ''} placeholder="e.g., D0120" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Default Cost"
                name="defaultCost"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={selectedProcedure.defaultCost}
              />
              <Select
                label="Category"
                name="category"
                options={CATEGORIES}
                defaultValue={selectedProcedure.category}
              />
            </div>

            <Input
              label="Estimated Duration (minutes)"
              name="estimatedDuration"
              type="number"
              min="0"
              defaultValue={selectedProcedure.estimatedDuration || ''}
              placeholder="Optional"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
              <textarea
                name="description"
                rows={3}
                defaultValue={selectedProcedure.description || ''}
                className="block w-full rounded-lg px-3.5 py-2.5 shadow-sm sm:text-sm bg-white dark:bg-surface-800 dark:text-gray-100 border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600"
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  handleDelete(selectedProcedure.id);
                  setShowEditModal(false);
                  setSelectedProcedure(null);
                }}
              >
                Delete
              </Button>
              <div className="flex space-x-3">
                <Button type="button" variant="secondary" onClick={() => {
                  setShowEditModal(false);
                  setSelectedProcedure(null);
                }}>
                  Cancel
                </Button>
                <Button type="submit" loading={updateProcedure.isPending}>
                  Save Changes
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Procedure Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedProcedure(null);
          setShowAddSupplyForm(false);
        }}
        title="Procedure Details"
        size="lg"
      >
        {selectedProcedure && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedProcedure.name}
                </h3>
                {selectedProcedure.code && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Code: {selectedProcedure.code}
                  </p>
                )}
              </div>
              <Badge variant={CATEGORY_COLORS[selectedProcedure.category]} size="md">
                {selectedProcedure.category}
              </Badge>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Default Cost</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  ${Number(selectedProcedure.defaultCost).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Estimated Duration</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedProcedure.estimatedDuration ? `${selectedProcedure.estimatedDuration} min` : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedProcedure.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Linked Supplies</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedProcedure._count?.procedureSupplies ?? 0}
                </p>
              </div>
            </div>

            {selectedProcedure.description && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Description</p>
                <p className="text-gray-900 dark:text-white">{selectedProcedure.description}</p>
              </div>
            )}

            {/* Required Supplies Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Required Supplies
                </h4>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAddSupplyForm(!showAddSupplyForm)}
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Supply
                </Button>
              </div>

              {/* Add Supply Inline Form */}
              {showAddSupplyForm && (
                <form onSubmit={handleAddSupply} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Supply
                      </label>
                      <select
                        name="supplyId"
                        required
                        className="block w-full rounded-lg px-3.5 py-2.5 shadow-sm sm:text-sm bg-white dark:bg-surface-800 dark:text-gray-100 border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600"
                      >
                        <option value="">Select a supply...</option>
                        {allSupplies?.data?.map((supply: { id: string; name: string; unit: string }) => (
                          <option key={supply.id} value={supply.id}>
                            {supply.name} ({supply.unit})
                          </option>
                        ))}
                      </select>
                    </div>
                    <Input
                      label="Quantity"
                      name="quantityUsed"
                      type="number"
                      min="1"
                      defaultValue="1"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowAddSupplyForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" loading={addProcedureSupply.isPending}>
                      <LinkIcon className="h-4 w-4 mr-1" />
                      Link Supply
                    </Button>
                  </div>
                </form>
              )}

              {/* Linked Supplies List */}
              {suppliesLoading ? (
                <LoadingSpinner className="py-4" />
              ) : procedureSupplies && procedureSupplies.length > 0 ? (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Supply Name
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Quantity
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Unit
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {procedureSupplies.map((link) => (
                        <tr key={link.id}>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                            {link.supply?.name || 'Unknown Supply'}
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-gray-900 dark:text-white font-medium">
                            {link.quantityUsed}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                            {link.supply?.unit || '-'}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSupply(link.id)}
                              title="Remove supply"
                            >
                              <TrashIcon className="h-4 w-4 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  No supplies linked to this procedure yet.
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button variant="secondary" onClick={() => {
                setShowDetailModal(false);
                setSelectedProcedure(null);
                setShowAddSupplyForm(false);
              }}>
                Close
              </Button>
              <Button onClick={() => {
                setShowDetailModal(false);
                setShowAddSupplyForm(false);
                openEditModal(selectedProcedure);
              }}>
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit Procedure
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
