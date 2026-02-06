import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  CloudArrowDownIcon,
  CloudArrowUpIcon,
  ServerIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  BuildingOffice2Icon,
  PhotoIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  getSystemInfo,
  downloadBackup,
  restoreBackup,
  parseBackupFile,
  getClinicSettings,
  updateClinicSettings,
  updateClinicLogo,
  removeClinicLogo,
  ClinicSettings,
} from '../services/admin';
import { BackupData } from '../types';

export default function AdminPage() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<BackupData | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Clinic settings
  const { data: clinicData, isLoading: clinicLoading } = useQuery({
    queryKey: ['clinic-settings'],
    queryFn: getClinicSettings,
  });

  const [clinicForm, setClinicForm] = useState<Omit<ClinicSettings, 'logoFilename'>>({
    name: '',
    address: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    if (clinicData) {
      setClinicForm({
        name: clinicData.name,
        address: clinicData.address,
        phone: clinicData.phone,
        email: clinicData.email,
      });
    }
  }, [clinicData]);

  const saveSettingsMutation = useMutation({
    mutationFn: updateClinicSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-settings'] });
      toast.success('Clinic information saved');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save clinic information');
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: updateClinicLogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-settings'] });
      toast.success('Logo updated');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to upload logo');
    },
  });

  const removeLogoMutation = useMutation({
    mutationFn: removeClinicLogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-settings'] });
      toast.success('Logo removed');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to remove logo');
    },
  });

  const handleLogoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const filePath = window.electronAPI.getFilePath(file);
    uploadLogoMutation.mutate(filePath);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }, [uploadLogoMutation]);

  const { data: systemInfo, isLoading: infoLoading, refetch } = useQuery({
    queryKey: ['system-info'],
    queryFn: getSystemInfo,
  });

  const handleDownloadBackup = async () => {
    setIsDownloading(true);
    try {
      await downloadBackup();
      toast.success('Backup downloaded successfully');
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to download backup');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBackupFile(file);
    setParseError(null);
    setParsedBackup(null);

    try {
      const parsed = await parseBackupFile(file);
      setParsedBackup(parsed);
    } catch (error: any) {
      setParseError(error.message);
    }
  }, []);

  const handleRestore = async () => {
    if (!parsedBackup) return;

    setIsRestoring(true);
    try {
      const result = await restoreBackup(parsedBackup);
      toast.success(result.message);
      setShowRestoreModal(false);
      setBackupFile(null);
      setParsedBackup(null);
      refetch();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to restore backup');
    } finally {
      setIsRestoring(false);
    }
  };

  const closeRestoreModal = () => {
    setShowRestoreModal(false);
    setBackupFile(null);
    setParsedBackup(null);
    setParseError(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">
          System administration and database management
        </p>
      </div>

      {/* Clinic Information */}
      <Card title="Clinic Information">
        {clinicLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Update your clinic details below. These will appear on PDF invoices and reports.
            </p>

            {/* Logo Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Clinic Logo
              </label>
              <div className="flex items-center gap-4">
                {clinicData?.logoFilename ? (
                  <div className="relative">
                    <img
                      src={`local-image://${clinicData.logoFilename}`}
                      alt="Clinic logo"
                      className="w-20 h-20 object-contain rounded-lg border border-gray-200 dark:border-gray-600 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => removeLogoMutation.mutate()}
                      disabled={removeLogoMutation.isPending}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm"
                      title="Remove logo"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                    <PhotoIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp,image/bmp"
                    onChange={handleLogoSelect}
                    className="hidden"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    loading={uploadLogoMutation.isPending}
                  >
                    <PhotoIcon className="w-4 h-4 mr-1.5" />
                    {clinicData?.logoFilename ? 'Change Logo' : 'Upload Logo'}
                  </Button>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    PNG, JPG, GIF, or WEBP. Will appear on PDF headers.
                  </p>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Clinic Name"
                value={clinicForm.name}
                onChange={(e) => setClinicForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Your Clinic Name"
              />
              <Input
                label="Email"
                type="email"
                value={clinicForm.email}
                onChange={(e) => setClinicForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="contact@clinic.com"
              />
              <Input
                label="Phone"
                value={clinicForm.phone}
                onChange={(e) => setClinicForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="(555) 123-4567"
              />
              <Input
                label="Address"
                value={clinicForm.address}
                onChange={(e) => setClinicForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="123 Main St, City, State 12345"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => saveSettingsMutation.mutate(clinicForm)}
                loading={saveSettingsMutation.isPending}
              >
                <BuildingOffice2Icon className="w-5 h-5 mr-2" />
                Save Clinic Information
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* System Info */}
      <Card title="System Information">
        {infoLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        ) : systemInfo ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {systemInfo.database.users}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Patients</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {systemInfo.database.patients}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Appointments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {systemInfo.database.appointments}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Treatments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {systemInfo.database.treatments}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Invoices</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {systemInfo.database.invoices}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Images</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {systemInfo.database.images}
                </p>
              </div>
            </div>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <ServerIcon className="w-4 h-4 mr-2" />
              Server time: {formatDate(systemInfo.serverTime)}
            </div>
          </div>
        ) : null}
      </Card>

      {/* Backup & Restore */}
      <Card title="Backup & Restore">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create a backup of your database or restore from a previous backup. Backups include all
            patient records, appointments, treatments, invoices, and related data.
          </p>

          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <ShieldCheckIcon className="w-4 h-4 mr-2" />
            Last backup: {formatDate(systemInfo?.lastBackup || null)}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleDownloadBackup} loading={isDownloading}>
              <CloudArrowDownIcon className="w-5 h-5 mr-2" />
              Download Backup
            </Button>
            <Button variant="secondary" onClick={() => setShowRestoreModal(true)}>
              <CloudArrowUpIcon className="w-5 h-5 mr-2" />
              Restore from Backup
            </Button>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <div className="flex">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                  Important Notes
                </h4>
                <ul className="mt-1 text-sm text-yellow-700 dark:text-yellow-400 list-disc list-inside">
                  <li>Backups do not include user passwords for security reasons</li>
                  <li>Image files are not included in the backup (metadata only)</li>
                  <li>Restoring will replace all existing data except user accounts</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Restore Modal */}
      <Modal isOpen={showRestoreModal} onClose={closeRestoreModal} title="Restore from Backup" size="lg">
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <div className="flex">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-300">Warning</h4>
                <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                  Restoring from a backup will permanently delete all current data (except user
                  accounts). This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          {/* File Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Backup File
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-primary-50 file:text-primary-700
                hover:file:bg-primary-100
                dark:file:bg-primary-900 dark:file:text-primary-300"
            />
          </div>

          {/* Parse Error */}
          {parseError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {parseError}
            </div>
          )}

          {/* Backup Info */}
          {parsedBackup && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Backup Information</h4>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <dt className="text-gray-500 dark:text-gray-400">Version:</dt>
                <dd className="text-gray-900 dark:text-white">{parsedBackup.version}</dd>
                <dt className="text-gray-500 dark:text-gray-400">Exported:</dt>
                <dd className="text-gray-900 dark:text-white">
                  {formatDate(parsedBackup.exportedAt)}
                </dd>
                <dt className="text-gray-500 dark:text-gray-400 col-span-2 mt-2">Records:</dt>
                {Object.entries(parsedBackup.metadata.counts).map(([key, count]) => (
                  <div key={key} className="contents">
                    <dt className="text-gray-500 dark:text-gray-400 pl-4">{key}:</dt>
                    <dd className="text-gray-900 dark:text-white">{count}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={closeRestoreModal}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleRestore}
              disabled={!parsedBackup}
              loading={isRestoring}
            >
              Restore Backup
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
