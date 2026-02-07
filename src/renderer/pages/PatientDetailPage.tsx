import { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeftIcon,
  PencilIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  DocumentArrowDownIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  TrashIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { usePatient, useUpdatePatient, useUpdateMedicalHistory } from '../hooks/usePatients';
import { usePatientImages } from '../hooks/useImages';
import { useQuery } from '@tanstack/react-query';
import * as appointmentService from '../services/appointments';
import { AppointmentStatus, RecallSchedule, RecallType, RecallStatus } from '../types';
import { getPatientBalance } from '../services/billing';
import { useRecalls, useCreateRecall, useUpdateRecall, useDeleteRecall } from '../hooks/useRecalls';
import { toast } from 'react-hot-toast';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import LoadingSpinner from '../components/common/LoadingSpinner';
import PatientForm from '../components/patients/PatientForm';
import DentalChart from '../components/dental-chart/DentalChart';
import ImageUpload from '../components/images/ImageUpload';
import ImageGallery from '../components/images/ImageGallery';
import { downloadDentalRecordPDF, downloadTreatmentSummaryPDF, downloadAccountStatementPDF } from '../services/reports';

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [activeTab, setActiveTab] = useState<'overview' | 'dental-chart' | 'history' | 'images'>('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMedicalHistoryModal, setShowMedicalHistoryModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingSummary, setIsDownloadingSummary] = useState(false);
  const [isDownloadingStatement, setIsDownloadingStatement] = useState(false);
  const [showRecallModal, setShowRecallModal] = useState(false);
  const [editingRecall, setEditingRecall] = useState<RecallSchedule | null>(null);

  const { data: patient, isLoading, error } = usePatient(id ?? '');
  const updatePatient = useUpdatePatient();
  const updateMedicalHistory = useUpdateMedicalHistory();
  const { data: imagesData, isLoading: imagesLoading } = usePatientImages(id ?? '', { limit: 50 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: upcomingAppointments, isLoading: loadingAppointments } = useQuery({
    queryKey: ['appointments', 'patient-upcoming', id],
    queryFn: () => appointmentService.getAppointments({
      patientId: id!,
      startDate: today.toISOString(),
      limit: 20,
      sortOrder: 'asc',
    }),
    enabled: !!id,
  });

  const { data: patientBalance } = useQuery({
    queryKey: ['patientBalance', id],
    queryFn: () => getPatientBalance(id!),
    enabled: !!id,
  });

  const { data: recallsData } = useRecalls({ patientId: id, limit: 50 });
  const createRecall = useCreateRecall();
  const updateRecall = useUpdateRecall();
  const deleteRecall = useDeleteRecall();

  const STATUS_COLORS: Record<AppointmentStatus, 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple'> = {
    SCHEDULED: 'blue',
    CONFIRMED: 'green',
    IN_PROGRESS: 'yellow',
    COMPLETED: 'green',
    CANCELLED: 'red',
    NO_SHOW: 'gray',
  };

  if (!id) {
    return <Navigate to="/patients" replace />;
  }

  if (isLoading) {
    return <LoadingSpinner className="py-12" />;
  }

  if (error || !patient) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load patient</p>
        <Link to="/patients" className="text-primary-600 hover:underline mt-2 inline-block">
          Back to patients
        </Link>
      </div>
    );
  }

  const handleUpdatePatient = async (data: any) => {
    await updatePatient.mutateAsync({ id: patient.id, data });
    setShowEditModal(false);
  };

  const handleUpdateMedicalHistory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    await updateMedicalHistory.mutateAsync({
      patientId: patient.id,
      data: {
        allergies: formData.get('allergies') as string || undefined,
        medications: formData.get('medications') as string || undefined,
        medicalConditions: formData.get('medicalConditions') as string || undefined,
        previousSurgeries: formData.get('previousSurgeries') as string || undefined,
        smokingStatus: formData.get('smokingStatus') as string || undefined,
        alcoholConsumption: formData.get('alcoholConsumption') as string || undefined,
        bloodType: formData.get('bloodType') as string || undefined,
        notes: formData.get('notes') as string || undefined,
      },
    });
    setShowMedicalHistoryModal(false);
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'dental-chart', label: 'Dental Chart' },
    { id: 'history', label: 'Medical History' },
    { id: 'images', label: 'Images' },
  ];

  const handleDownloadDentalRecord = async () => {
    setIsDownloading(true);
    try {
      await downloadDentalRecordPDF(patient.id);
    } catch (error) {
      console.error('Failed to download dental record:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadTreatmentSummary = async () => {
    setIsDownloadingSummary(true);
    try {
      await downloadTreatmentSummaryPDF(patient.id);
    } catch (error) {
      console.error('Failed to download treatment summary:', error);
    } finally {
      setIsDownloadingSummary(false);
    }
  };

  const handleDownloadAccountStatement = async () => {
    setIsDownloadingStatement(true);
    try {
      await downloadAccountStatementPDF(patient.id);
    } catch (error) {
      console.error('Failed to download account statement:', error);
    } finally {
      setIsDownloadingStatement(false);
    }
  };

  const handleCreateRecall = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await createRecall.mutateAsync({
      patientId: patient.id,
      recallType: formData.get('recallType') as RecallType,
      intervalMonths: parseInt(formData.get('intervalMonths') as string),
      lastVisitDate: formData.get('lastVisitDate') as string || undefined,
      notes: formData.get('notes') as string || undefined,
    });
    setShowRecallModal(false);
  };

  const handleUpdateRecall = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingRecall) return;
    const formData = new FormData(e.currentTarget);
    await updateRecall.mutateAsync({
      id: editingRecall.id,
      data: {
        recallType: formData.get('recallType') as RecallType,
        intervalMonths: parseInt(formData.get('intervalMonths') as string),
        lastVisitDate: formData.get('lastVisitDate') as string || undefined,
        notes: formData.get('notes') as string || undefined,
      },
    });
    setEditingRecall(null);
  };

  const handleDeleteRecall = async (recallId: string) => {
    if (!confirm('Delete this recall schedule?')) return;
    await deleteRecall.mutateAsync(recallId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/patients"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Patient since {format(new Date(patient.createdAt), 'MMMM yyyy')}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="secondary" onClick={handleDownloadAccountStatement} loading={isDownloadingStatement}>
            <CurrencyDollarIcon className="h-4 w-4 mr-2" />
            Account Statement
          </Button>
          <Button variant="secondary" onClick={handleDownloadTreatmentSummary} loading={isDownloadingSummary}>
            <ClipboardDocumentListIcon className="h-4 w-4 mr-2" />
            Treatment Summary
          </Button>
          <Button variant="secondary" onClick={handleDownloadDentalRecord} loading={isDownloading}>
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Dental Record
          </Button>
          <Button onClick={() => setShowEditModal(true)}>
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Contact Info */}
          <Card title="Contact Information">
            <div className="space-y-4">
              <div className="flex items-center">
                <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-gray-900 dark:text-white">{patient.phone}</span>
              </div>
              {patient.email && (
                <div className="flex items-center">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-900 dark:text-white">{patient.email}</span>
                </div>
              )}
              {patient.address && (
                <div className="flex items-start">
                  <MapPinIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <span className="text-gray-900 dark:text-white">{patient.address}</span>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                Personal Details
              </h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Date of Birth</dt>
                  <dd className="text-gray-900 dark:text-white">
                    {format(new Date(patient.dateOfBirth), 'MMM d, yyyy')}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500 dark:text-gray-400">Gender</dt>
                  <dd className="text-gray-900 dark:text-white">{patient.gender || 'Not specified'}</dd>
                </div>
              </dl>
            </div>

            {(patient.emergencyContact || patient.emergencyPhone) && (
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                  Emergency Contact
                </h4>
                <p className="text-gray-900 dark:text-white">{patient.emergencyContact}</p>
                <p className="text-gray-500 dark:text-gray-400">{patient.emergencyPhone}</p>
              </div>
            )}

            {(patient.insuranceProvider || patient.insuranceNumber) && (
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                  Insurance
                </h4>
                <p className="text-gray-900 dark:text-white">{patient.insuranceProvider}</p>
                <p className="text-gray-500 dark:text-gray-400">#{patient.insuranceNumber}</p>
              </div>
            )}
          </Card>

          {/* Upcoming Appointments */}
          <Card title="Upcoming Appointments" className="lg:col-span-2">
            {loadingAppointments ? (
              <LoadingSpinner className="py-4" />
            ) : upcomingAppointments?.data && upcomingAppointments.data.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/30">
                {upcomingAppointments.data.map((apt) => (
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
                      {apt.dentist && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          with Dr. {apt.dentist.firstName} {apt.dentist.lastName}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No upcoming appointments
              </p>
            )}
          </Card>

          {/* Financial Summary */}
          <Card title="Financial Summary">
            {patientBalance ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Invoiced</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">${patientBalance.totalInvoiced.toFixed(2)}</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Paid</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">${patientBalance.totalPaid.toFixed(2)}</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">${patientBalance.balance.toFixed(2)}</p>
                  </div>
                </div>
                {patientBalance.unpaidInvoices.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Unpaid Invoices</h4>
                    <div className="space-y-2">
                      {patientBalance.unpaidInvoices.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between text-sm">
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">{inv.invoiceNumber}</span>
                            {inv.dueDate && (
                              <span className="ml-2 text-xs text-gray-500">
                                Due {format(new Date(inv.dueDate), 'MMM d')}
                              </span>
                            )}
                          </div>
                          <span className="font-medium text-red-600 dark:text-red-400">${inv.balance.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No billing data</p>
            )}
          </Card>

          {/* Recall Schedule */}
          <Card
            title="Recall Schedule"
            className="lg:col-span-2"
            action={
              <Button size="sm" onClick={() => setShowRecallModal(true)}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add
              </Button>
            }
          >
            {recallsData?.data && recallsData.data.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/30">
                {recallsData.data.map((recall) => {
                  const statusColors: Record<RecallStatus, 'blue' | 'yellow' | 'red' | 'green'> = {
                    UPCOMING: 'blue',
                    DUE: 'yellow',
                    OVERDUE: 'red',
                    COMPLETED: 'green',
                  };
                  return (
                    <div key={recall.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <CalendarDaysIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {recall.recallType}
                            </span>
                            <Badge variant={statusColors[recall.status]}>{recall.status}</Badge>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Every {recall.intervalMonths} months &middot; Next: {format(new Date(recall.nextDueDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditingRecall(recall)}>
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteRecall(recall.id)}>
                          <TrashIcon className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">No recall schedules</p>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'dental-chart' && <DentalChart patientId={patient.id} />}

      {activeTab === 'images' && (
        <Card
          title="Patient Images"
          action={
            <Button onClick={() => setShowUploadModal(true)}>
              Upload Images
            </Button>
          }
        >
          <ImageGallery
            images={imagesData?.data || []}
            isLoading={imagesLoading}
            patientId={patient.id}
          />
        </Card>
      )}

      {activeTab === 'history' && (
        <Card
          title="Medical History"
          action={
            <Button variant="secondary" size="sm" onClick={() => setShowMedicalHistoryModal(true)}>
              <PencilIcon className="h-4 w-4 mr-1" />
              Edit
            </Button>
          }
        >
          {patient.medicalHistory ? (
            <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Allergies</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {patient.medicalHistory.allergies || 'None reported'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Current Medications</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {patient.medicalHistory.medications || 'None reported'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Medical Conditions</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {patient.medicalHistory.medicalConditions || 'None reported'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Previous Surgeries</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {patient.medicalHistory.previousSurgeries || 'None reported'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Smoking Status</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {patient.medicalHistory.smokingStatus || 'Not specified'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Alcohol Consumption</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {patient.medicalHistory.alcoholConsumption || 'Not specified'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Blood Type</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {patient.medicalHistory.bloodType || 'Not specified'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {patient.medicalHistory.notes || 'No additional notes'}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              No medical history recorded
            </p>
          )}
        </Card>
      )}

      {/* Edit Patient Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Patient"
        size="lg"
      >
        <PatientForm
          initialData={{
            firstName: patient.firstName,
            lastName: patient.lastName,
            email: patient.email || '',
            phone: patient.phone,
            dateOfBirth: format(new Date(patient.dateOfBirth), 'yyyy-MM-dd'),
            gender: patient.gender || '',
            address: patient.address || '',
            emergencyContact: patient.emergencyContact || '',
            emergencyPhone: patient.emergencyPhone || '',
            insuranceProvider: patient.insuranceProvider || '',
            insuranceNumber: patient.insuranceNumber || '',
            notes: patient.notes || '',
          }}
          onSubmit={handleUpdatePatient}
          onCancel={() => setShowEditModal(false)}
          isLoading={updatePatient.isPending}
        />
      </Modal>

      {/* Edit Medical History Modal */}
      <Modal
        isOpen={showMedicalHistoryModal}
        onClose={() => setShowMedicalHistoryModal(false)}
        title="Edit Medical History"
        size="lg"
      >
        <form onSubmit={handleUpdateMedicalHistory} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Allergies
              </label>
              <textarea
                name="allergies"
                rows={2}
                defaultValue={patient.medicalHistory?.allergies || ''}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                placeholder="List any known allergies"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Medications
              </label>
              <textarea
                name="medications"
                rows={2}
                defaultValue={patient.medicalHistory?.medications || ''}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                placeholder="List current medications"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Medical Conditions
              </label>
              <textarea
                name="medicalConditions"
                rows={2}
                defaultValue={patient.medicalHistory?.medicalConditions || ''}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                placeholder="List any medical conditions"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Previous Surgeries
              </label>
              <textarea
                name="previousSurgeries"
                rows={2}
                defaultValue={patient.medicalHistory?.previousSurgeries || ''}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                placeholder="List previous surgeries"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Smoking Status
              </label>
              <select
                name="smokingStatus"
                defaultValue={patient.medicalHistory?.smokingStatus || ''}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="">Not specified</option>
                <option value="Never">Never</option>
                <option value="Former smoker">Former smoker</option>
                <option value="Current smoker">Current smoker</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Alcohol Consumption
              </label>
              <select
                name="alcoholConsumption"
                defaultValue={patient.medicalHistory?.alcoholConsumption || ''}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="">Not specified</option>
                <option value="None">None</option>
                <option value="Occasional">Occasional</option>
                <option value="Moderate">Moderate</option>
                <option value="Heavy">Heavy</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Blood Type
              </label>
              <select
                name="bloodType"
                defaultValue={patient.medicalHistory?.bloodType || ''}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              >
                <option value="">Not specified</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Additional Notes
            </label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={patient.medicalHistory?.notes || ''}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              placeholder="Any additional medical notes"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="secondary" onClick={() => setShowMedicalHistoryModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={updateMedicalHistory.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Upload Images Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Images"
        size="lg"
      >
        <ImageUpload
          patientId={patient.id}
          onSuccess={() => setShowUploadModal(false)}
        />
      </Modal>

      {/* Create Recall Modal */}
      <Modal
        isOpen={showRecallModal}
        onClose={() => setShowRecallModal(false)}
        title="Add Recall Schedule"
        size="md"
      >
        <form onSubmit={handleCreateRecall} className="space-y-4">
          <Select
            label="Recall Type"
            name="recallType"
            required
            options={[
              { value: 'CLEANING', label: 'Cleaning' },
              { value: 'CHECKUP', label: 'Checkup' },
              { value: 'FOLLOWUP', label: 'Follow-up' },
              { value: 'XRAY', label: 'X-Ray' },
              { value: 'OTHER', label: 'Other' },
            ]}
          />
          <Input label="Interval (months)" name="intervalMonths" type="number" min="1" max="24" required defaultValue="6" />
          <Input label="Last Visit Date" name="lastVisitDate" type="date" />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea name="notes" rows={2} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100" />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowRecallModal(false)}>Cancel</Button>
            <Button type="submit" loading={createRecall.isPending}>Add Recall</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Recall Modal */}
      <Modal
        isOpen={!!editingRecall}
        onClose={() => setEditingRecall(null)}
        title="Edit Recall Schedule"
        size="md"
      >
        {editingRecall && (
          <form onSubmit={handleUpdateRecall} className="space-y-4">
            <Select
              label="Recall Type"
              name="recallType"
              required
              defaultValue={editingRecall.recallType}
              options={[
                { value: 'CLEANING', label: 'Cleaning' },
                { value: 'CHECKUP', label: 'Checkup' },
                { value: 'FOLLOWUP', label: 'Follow-up' },
                { value: 'XRAY', label: 'X-Ray' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
            <Input label="Interval (months)" name="intervalMonths" type="number" min="1" max="24" required defaultValue={editingRecall.intervalMonths} />
            <Input label="Last Visit Date" name="lastVisitDate" type="date" defaultValue={editingRecall.lastVisitDate ? format(new Date(editingRecall.lastVisitDate), 'yyyy-MM-dd') : ''} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea name="notes" rows={2} defaultValue={editingRecall.notes || ''} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100" />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setEditingRecall(null)}>Cancel</Button>
              <Button type="submit" loading={updateRecall.isPending}>Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
