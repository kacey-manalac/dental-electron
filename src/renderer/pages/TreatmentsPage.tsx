import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import * as treatmentService from '../services/treatments';
import { unwrap } from '../services/api';
import { usePatients } from '../hooks/usePatients';
import { Treatment, TreatmentStatus } from '../types';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import Input from '../components/common/Input';
import Select from '../components/common/Select';

const STATUS_COLORS: Record<TreatmentStatus, 'blue' | 'yellow' | 'green' | 'red'> = {
  PLANNED: 'blue',
  IN_PROGRESS: 'yellow',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

export default function TreatmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [page, setPage] = useState(1);

  // Sync URL search param on mount
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch) {
      setSearch(urlSearch);
      // Clear the URL param after reading it
      setSearchParams({}, { replace: true });
    }
  }, []);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const queryClient = useQueryClient();

  // Fetch first dentist from DB to use as default
  const { data: dentists } = useQuery({
    queryKey: ['dentists'],
    queryFn: async () => unwrap(await window.electronAPI.users.getDentists()),
  });
  const defaultDentistId = dentists?.[0]?.id || '';

  const { data, isLoading } = useQuery({
    queryKey: ['treatments', { page, search }],
    queryFn: () => treatmentService.getTreatments({ page, limit: 10, search }),
  });

  const { data: patientsData } = usePatients({ limit: 100 });

  const createTreatment = useMutation({
    mutationFn: treatmentService.createTreatment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
      toast.success('Treatment created');
      setShowCreateModal(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create treatment');
    },
  });

  const updateTreatment = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<any> }) =>
      treatmentService.updateTreatment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
      toast.success('Treatment updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update treatment');
    },
  });

  const handleCreateTreatment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    await createTreatment.mutateAsync({
      patientId: formData.get('patientId') as string,
      dentistId: defaultDentistId,
      procedureName: formData.get('procedureName') as string,
      procedureCode: formData.get('procedureCode') as string || undefined,
      description: formData.get('description') as string || undefined,
      toothNumber: formData.get('toothNumber') ? parseInt(formData.get('toothNumber') as string) : undefined,
      cost: parseFloat(formData.get('cost') as string),
      status: 'PLANNED',
    });
  };

  const handleUpdateStatus = async (treatmentId: string, status: TreatmentStatus) => {
    await updateTreatment.mutateAsync({ id: treatmentId, data: { status } });
    setSelectedTreatment(null);
  };

  const handleUpdateTreatment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTreatment) return;

    const formData = new FormData(e.currentTarget);
    await updateTreatment.mutateAsync({
      id: selectedTreatment.id,
      data: {
        patientId: formData.get('patientId') as string,
        procedureName: formData.get('procedureName') as string,
        procedureCode: formData.get('procedureCode') as string || undefined,
        description: formData.get('description') as string || undefined,
        toothNumber: formData.get('toothNumber') ? parseInt(formData.get('toothNumber') as string) : undefined,
        cost: parseFloat(formData.get('cost') as string),
        status: formData.get('status') as TreatmentStatus,
        notes: formData.get('notes') as string || undefined,
      },
    });
    setSelectedTreatment(null);
    setIsEditing(false);
  };

  const closeTreatmentModal = () => {
    setSelectedTreatment(null);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Treatments</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Treatment
        </Button>
      </div>

      {/* Search */}
      <Card>
        <div className="flex items-center">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 mr-3" />
          <input
            type="text"
            placeholder="Search treatments..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="flex-1 border-0 focus:ring-0 text-gray-900 dark:text-white dark:bg-gray-800 placeholder-gray-400"
          />
        </div>
      </Card>

      {/* Treatments List */}
      <Card>
        {isLoading ? (
          <LoadingSpinner className="py-12" />
        ) : data?.data.length === 0 ? (
          <EmptyState
            title="No treatments found"
            description={search ? 'Try adjusting your search' : 'Get started by adding a treatment'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Procedure
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tooth
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data?.data.map((treatment) => (
                    <tr
                      key={treatment.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => setSelectedTreatment(treatment)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {treatment.procedureName}
                        </div>
                        {treatment.procedureCode && (
                          <div className="text-sm text-gray-500">{treatment.procedureCode}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {treatment.patient?.firstName} {treatment.patient?.lastName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {treatment.toothNumber || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={STATUS_COLORS[treatment.status]}>
                          {treatment.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        ${Number(treatment.cost).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(treatment.createdAt), 'MMM d, yyyy')}
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

      {/* Create Treatment Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Treatment"
        size="md"
      >
        <form onSubmit={handleCreateTreatment} className="space-y-4">
          <Select
            label="Patient"
            name="patientId"
            required
            options={patientsData?.data.map((p) => ({
              value: p.id,
              label: `${p.firstName} ${p.lastName}`,
            })) || []}
          />
          <Input label="Procedure Name" name="procedureName" required placeholder="e.g., Root Canal Treatment" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Procedure Code" name="procedureCode" placeholder="e.g., D3310" />
            <Input label="Tooth Number" name="toothNumber" type="number" min="1" max="32" />
          </div>
          <Input label="Cost" name="cost" type="number" step="0.01" min="0" required />
          <div>
            <label className="label">Description</label>
            <textarea
              name="description"
              rows={3}
              className="input"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createTreatment.isPending}>
              Add Treatment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Treatment Details Modal */}
      <Modal
        isOpen={!!selectedTreatment}
        onClose={closeTreatmentModal}
        title={isEditing ? "Edit Treatment" : "Treatment Details"}
        size="md"
      >
        {selectedTreatment && !isEditing && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {selectedTreatment.procedureName}
              </h3>
              {selectedTreatment.procedureCode && (
                <p className="text-sm text-gray-500 mt-0.5">{selectedTreatment.procedureCode}</p>
              )}
              <div className="mt-2">
                <Badge variant={STATUS_COLORS[selectedTreatment.status]}>
                  {selectedTreatment.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Patient:</span>
                <span className="text-gray-900 dark:text-white">
                  {selectedTreatment.patient?.firstName} {selectedTreatment.patient?.lastName}
                </span>
              </div>
              {selectedTreatment.toothNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tooth:</span>
                  <span className="text-gray-900 dark:text-white">#{selectedTreatment.toothNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Cost:</span>
                <span className="text-gray-900 dark:text-white">${Number(selectedTreatment.cost).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created:</span>
                <span className="text-gray-900 dark:text-white">
                  {format(new Date(selectedTreatment.createdAt), 'MMMM d, yyyy')}
                </span>
              </div>
              {selectedTreatment.description && (
                <div>
                  <span className="text-gray-500">Description:</span>
                  <p className="mt-1 text-gray-900 dark:text-white">{selectedTreatment.description}</p>
                </div>
              )}
              {selectedTreatment.notes && (
                <div>
                  <span className="text-gray-500">Notes:</span>
                  <p className="mt-1 text-gray-900 dark:text-white">{selectedTreatment.notes}</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <label className="label">Update Status</label>
              <div className="flex flex-wrap gap-2">
                {(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as TreatmentStatus[]).map(
                  (status) => (
                    <Button
                      key={status}
                      variant={selectedTreatment.status === status ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedTreatment.id, status)}
                      loading={updateTreatment.isPending}
                    >
                      {status.replace('_', ' ')}
                    </Button>
                  )
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button variant="secondary" onClick={closeTreatmentModal}>
                Close
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                Edit Treatment
              </Button>
            </div>
          </div>
        )}

        {selectedTreatment && isEditing && (
          <form onSubmit={handleUpdateTreatment} className="space-y-4">
            <Select
              label="Patient"
              name="patientId"
              required
              defaultValue={selectedTreatment.patientId}
              options={patientsData?.data.map((p) => ({
                value: p.id,
                label: `${p.firstName} ${p.lastName}`,
              })) || []}
            />
            <Input
              label="Procedure Name"
              name="procedureName"
              required
              defaultValue={selectedTreatment.procedureName}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Procedure Code"
                name="procedureCode"
                defaultValue={selectedTreatment.procedureCode || ''}
              />
              <Input
                label="Tooth Number"
                name="toothNumber"
                type="number"
                min="1"
                max="32"
                defaultValue={selectedTreatment.toothNumber || ''}
              />
            </div>
            <Input
              label="Cost"
              name="cost"
              type="number"
              step="0.01"
              min="0"
              required
              defaultValue={selectedTreatment.cost}
            />
            <Select
              label="Status"
              name="status"
              required
              defaultValue={selectedTreatment.status}
              options={[
                { value: 'PLANNED', label: 'Planned' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
            <div>
              <label className="label">Description</label>
              <textarea
                name="description"
                rows={2}
                defaultValue={selectedTreatment.description || ''}
                className="input"
              />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                name="notes"
                rows={2}
                defaultValue={selectedTreatment.notes || ''}
                className="input"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={updateTreatment.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
