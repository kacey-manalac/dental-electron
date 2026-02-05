import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  CloudArrowDownIcon,
  CloudArrowUpIcon,
  ServerIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { getSystemInfo, downloadBackup, restoreBackup, parseBackupFile } from '../services/admin';
import { BackupData } from '../types';

export default function AdminPage() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<BackupData | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

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
