import { unwrap } from './api';
import { SystemInfo, BackupData } from '../types';

export interface ClinicSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  logoFilename?: string;
}

export async function getClinicSettings(): Promise<ClinicSettings> {
  return unwrap(await window.electronAPI.clinicSettings.get());
}

export async function updateClinicSettings(data: Partial<ClinicSettings>): Promise<ClinicSettings> {
  return unwrap(await window.electronAPI.clinicSettings.update(data));
}

export async function updateClinicLogo(filePath: string): Promise<ClinicSettings> {
  return unwrap(await window.electronAPI.clinicSettings.updateLogo(filePath));
}

export async function removeClinicLogo(): Promise<ClinicSettings> {
  return unwrap(await window.electronAPI.clinicSettings.removeLogo());
}

export async function getSystemInfo(): Promise<SystemInfo> {
  return unwrap(await window.electronAPI.admin.systemInfo());
}

export async function downloadBackup(): Promise<void> {
  unwrap(await window.electronAPI.admin.backup());
}

export async function restoreBackup(backupData: BackupData): Promise<{ message: string; restoredCounts: Record<string, number>; backupDate: string }> {
  return unwrap(await window.electronAPI.admin.restore(backupData));
}

export async function parseBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (!data.version || !data.data) {
          reject(new Error('Invalid backup file format'));
          return;
        }
        resolve(data as BackupData);
      } catch {
        reject(new Error('Failed to parse backup file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
