import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, ClockIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { exportPatients } from '../services/exports';
import { toast } from 'react-hot-toast';
import { usePatients, useCreatePatient } from '../hooks/usePatients';
import { useQuery } from '@tanstack/react-query';
import * as appointmentService from '../services/appointments';
import { format } from 'date-fns';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import PatientForm from '../components/patients/PatientForm';
import { AppointmentStatus } from '../types';

const STATUS_COLORS: Record<AppointmentStatus, 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple'> = {
  SCHEDULED: 'blue',
  CONFIRMED: 'green',
  IN_PROGRESS: 'yellow',
  COMPLETED: 'green',
  CANCELLED: 'red',
  NO_SHOW: 'gray',
};

export default function PatientsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [appointmentsPatient, setAppointmentsPatient] = useState<{ id: string; name: string } | null>(null);

  const navigate = useNavigate();
  const { data, isLoading } = usePatients({ page, limit: 10, search });
  const createPatient = useCreatePatient();

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const { data: patientAppointments, isLoading: loadingAppointments } = useQuery({
    queryKey: ['appointments', 'patient', appointmentsPatient?.id],
    queryFn: () => appointmentService.getAppointments({
      patientId: appointmentsPatient!.id,
      startDate: now.toISOString(),
      limit: 50,
      sortOrder: 'asc',
    }),
    enabled: !!appointmentsPatient,
  });

  const handleCreatePatient = async (formData: any) => {
    await createPatient.mutateAsync(formData);
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Patients</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              const result = await exportPatients();
              if (result.filePath) toast.success('Exported successfully');
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export
          </button>
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Patient
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <div className="flex items-center">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 mr-3" />
          <input
            type="text"
            placeholder="Search patients..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="flex-1 border-0 focus:ring-0 text-gray-900 dark:text-white dark:bg-gray-800 placeholder-gray-400"
          />
        </div>
      </Card>

      {/* Patient List */}
      <Card>
        {isLoading ? (
          <LoadingSpinner className="py-12" />
        ) : data?.data.length === 0 ? (
          <EmptyState
            title="No patients found"
            description={search ? 'Try adjusting your search' : 'Get started by adding your first patient'}
            action={
              !search && (
                <Button onClick={() => setShowCreateModal(true)}>
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Patient
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date of Birth
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Appointments
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {data?.data.map((patient) => (
                    <tr
                      key={patient.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => navigate(`/patients/${patient.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                              <span className="text-primary-600 dark:text-primary-400 font-medium">
                                {patient.firstName[0]}{patient.lastName[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {patient.firstName} {patient.lastName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {patient.gender || 'Not specified'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{patient.phone}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{patient.email || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(patient.dateOfBirth), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAppointmentsPatient({ id: patient.id, name: `${patient.firstName} ${patient.lastName}` });
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                        >
                          {patient._count?.appointments || 0}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/patients/${patient.id}`}
                          className="text-primary-600 hover:text-primary-900 dark:hover:text-primary-400"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3 sm:px-6 mt-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, data.pagination.total)} of {data.pagination.total} patients
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

      {/* Create Patient Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Patient"
        size="lg"
      >
        <PatientForm
          onSubmit={handleCreatePatient}
          onCancel={() => setShowCreateModal(false)}
          isLoading={createPatient.isPending}
        />
      </Modal>

      {/* Patient Appointments Modal */}
      <Modal
        isOpen={!!appointmentsPatient}
        onClose={() => setAppointmentsPatient(null)}
        title={`Appointments — ${appointmentsPatient?.name || ''}`}
        size="lg"
      >
        {loadingAppointments ? (
          <LoadingSpinner className="py-8" />
        ) : !patientAppointments?.data.length ? (
          <p className="py-8 text-sm text-gray-500 dark:text-gray-400 text-center">
            No appointments found
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/30 max-h-[60vh] overflow-y-auto">
            {patientAppointments.data.map((apt) => (
              <div key={apt.id} className="flex items-start gap-3 py-3">
                <div className="w-1 self-stretch rounded-full bg-gradient-to-b from-primary-500 to-primary-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {apt.title}
                    </p>
                    <Badge variant={STATUS_COLORS[apt.status]}>
                      {apt.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <ClockIcon className="h-3.5 w-3.5" />
                    {format(new Date(apt.startTime), 'MMM d, yyyy')} &middot; {format(new Date(apt.startTime), 'h:mm a')} - {format(new Date(apt.endTime), 'h:mm a')}
                  </div>
                  {apt.description && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                      {apt.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
          <Button variant="secondary" onClick={() => setAppointmentsPatient(null)}>
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
}
