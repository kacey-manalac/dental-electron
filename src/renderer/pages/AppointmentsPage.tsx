import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useAppointments, useCreateAppointment, useUpdateAppointment } from '../hooks/useAppointments';
import { usePatients } from '../hooks/usePatients';
import { Appointment, AppointmentStatus } from '../types';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import { useQuery } from '@tanstack/react-query';
import { unwrap } from '../services/api';

const STATUS_COLORS: Record<AppointmentStatus, 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple'> = {
  SCHEDULED: 'blue',
  CONFIRMED: 'green',
  IN_PROGRESS: 'yellow',
  COMPLETED: 'green',
  CANCELLED: 'red',
  NO_SHOW: 'gray',
};

export default function AppointmentsPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [_selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch first dentist from DB to use as default
  const { data: dentists } = useQuery({
    queryKey: ['dentists'],
    queryFn: async () => unwrap(await window.electronAPI.users.getDentists()),
  });
  const defaultDentistId = dentists?.[0]?.id || '';

  const startDate = startOfMonth(currentMonth);
  const endDate = endOfMonth(currentMonth);

  const { data: appointmentsData, isLoading } = useAppointments({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    limit: 100,
  });

  const { data: patientsData } = usePatients({ limit: 100 });
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getAppointmentsForDay = (date: Date) => {
    return appointmentsData?.data.filter(
      (apt) => isSameDay(new Date(apt.startTime), date)
    ) || [];
  };

  const handleCreateAppointment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    await createAppointment.mutateAsync({
      patientId: formData.get('patientId') as string,
      dentistId: defaultDentistId,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      startTime: new Date(`${formData.get('date')}T${formData.get('startTime')}`).toISOString(),
      endTime: new Date(`${formData.get('date')}T${formData.get('endTime')}`).toISOString(),
    });

    setShowCreateModal(false);
  };

  const handleUpdateStatus = async (appointmentId: string, status: AppointmentStatus) => {
    await updateAppointment.mutateAsync({
      id: appointmentId,
      data: { status },
    });
    setSelectedAppointment(null);
  };

  const handleUpdateAppointment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    const formData = new FormData(e.currentTarget);
    const dateStr = formData.get('date') as string;
    const startTimeStr = formData.get('startTime') as string;
    const endTimeStr = formData.get('endTime') as string;

    await updateAppointment.mutateAsync({
      id: selectedAppointment.id,
      data: {
        patientId: formData.get('patientId') as string,
        title: formData.get('title') as string,
        description: formData.get('description') as string || undefined,
        startTime: new Date(`${dateStr}T${startTimeStr}`).toISOString(),
        endTime: new Date(`${dateStr}T${endTimeStr}`).toISOString(),
        status: formData.get('status') as AppointmentStatus,
      },
    });

    setSelectedAppointment(null);
    setIsEditing(false);
  };

  const closeAppointmentModal = () => {
    setSelectedAppointment(null);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Appointments</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-5 w-5 mr-2" />
          New Appointment
        </Button>
      </div>

      <Card>
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex space-x-2">
            <Button variant="secondary" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setCurrentMonth(new Date())}>
              Today
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner className="py-12" />
        ) : (
          <>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
              {/* Day Headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div
                  key={day}
                  className="bg-gray-50 dark:bg-gray-800 py-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400"
                >
                  {day}
                </div>
              ))}

              {/* Calendar Days */}
              {days.map((day) => {
                const dayAppointments = getAppointmentsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentMonth);

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-24 bg-white dark:bg-gray-800 p-2 ${
                      !isCurrentMonth ? 'opacity-50' : ''
                    }`}
                    onClick={() => setSelectedDate(day)}
                  >
                    <div
                      className={`text-sm font-medium mb-1 ${
                        isToday
                          ? 'h-6 w-6 rounded-full bg-primary-600 text-white flex items-center justify-center'
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayAppointments.slice(0, 2).map((apt) => (
                        <button
                          key={apt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAppointment(apt);
                          }}
                          className="w-full text-left text-xs p-1 rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 truncate hover:bg-primary-200 dark:hover:bg-primary-900/50"
                        >
                          {format(new Date(apt.startTime), 'h:mm a')} - {apt.title}
                        </button>
                      ))}
                      {dayAppointments.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{dayAppointments.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Create Appointment Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="New Appointment"
        size="md"
      >
        <form onSubmit={handleCreateAppointment} className="space-y-4">
          <Select
            label="Patient"
            name="patientId"
            required
            options={patientsData?.data.map((p) => ({
              value: p.id,
              label: `${p.firstName} ${p.lastName}`,
            })) || []}
          />
          <Input label="Title" name="title" required placeholder="e.g., Regular Checkup" />
          <Input label="Date" name="date" type="date" required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Time" name="startTime" type="time" required />
            <Input label="End Time" name="endTime" type="time" required />
          </div>
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
            <Button type="submit" loading={createAppointment.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      {/* Appointment Details Modal */}
      <Modal
        isOpen={!!selectedAppointment}
        onClose={closeAppointmentModal}
        title={isEditing ? "Edit Appointment" : "Appointment Details"}
        size="md"
      >
        {selectedAppointment && !isEditing && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {selectedAppointment.title}
              </h3>
              <Badge variant={STATUS_COLORS[selectedAppointment.status]}>
                {selectedAppointment.status.replace('_', ' ')}
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Patient:</span>
                <span className="text-gray-900 dark:text-white">
                  {selectedAppointment.patient?.firstName} {selectedAppointment.patient?.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date:</span>
                <span className="text-gray-900 dark:text-white">
                  {format(new Date(selectedAppointment.startTime), 'MMMM d, yyyy')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Time:</span>
                <span className="text-gray-900 dark:text-white">
                  {format(new Date(selectedAppointment.startTime), 'h:mm a')} - {format(new Date(selectedAppointment.endTime), 'h:mm a')}
                </span>
              </div>
              {selectedAppointment.description && (
                <div>
                  <span className="text-gray-500">Description:</span>
                  <p className="mt-1 text-gray-900 dark:text-white">{selectedAppointment.description}</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <label className="label">Update Status</label>
              <div className="flex flex-wrap gap-2">
                {(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as AppointmentStatus[]).map(
                  (status) => (
                    <Button
                      key={status}
                      variant={selectedAppointment.status === status ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedAppointment.id, status)}
                      loading={updateAppointment.isPending}
                    >
                      {status.replace('_', ' ')}
                    </Button>
                  )
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button variant="secondary" onClick={closeAppointmentModal}>
                Close
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                Edit Appointment
              </Button>
            </div>
          </div>
        )}

        {selectedAppointment && isEditing && (
          <form onSubmit={handleUpdateAppointment} className="space-y-4">
            <Select
              label="Patient"
              name="patientId"
              required
              defaultValue={selectedAppointment.patientId}
              options={patientsData?.data.map((p) => ({
                value: p.id,
                label: `${p.firstName} ${p.lastName}`,
              })) || []}
            />
            <Input
              label="Title"
              name="title"
              required
              defaultValue={selectedAppointment.title}
            />
            <Input
              label="Date"
              name="date"
              type="date"
              required
              defaultValue={format(new Date(selectedAppointment.startTime), 'yyyy-MM-dd')}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Time"
                name="startTime"
                type="time"
                required
                defaultValue={format(new Date(selectedAppointment.startTime), 'HH:mm')}
              />
              <Input
                label="End Time"
                name="endTime"
                type="time"
                required
                defaultValue={format(new Date(selectedAppointment.endTime), 'HH:mm')}
              />
            </div>
            <Select
              label="Status"
              name="status"
              required
              defaultValue={selectedAppointment.status}
              options={[
                { value: 'SCHEDULED', label: 'Scheduled' },
                { value: 'CONFIRMED', label: 'Confirmed' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
                { value: 'NO_SHOW', label: 'No Show' },
              ]}
            />
            <div>
              <label className="label">Description</label>
              <textarea
                name="description"
                rows={3}
                defaultValue={selectedAppointment.description || ''}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={updateAppointment.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
