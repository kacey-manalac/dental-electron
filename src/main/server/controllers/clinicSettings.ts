import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export interface ClinicSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  logoFilename?: string;
}

const DEFAULT_SETTINGS: ClinicSettings = {
  name: 'Dental Care Clinic',
  address: '123 Medical Center Drive, Healthcare City, HC 12345',
  phone: '(555) 123-4567',
  email: 'info@dentalcareclinic.com',
};

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'clinic-settings.json');
}

function getUploadsDir(): string {
  const dir = path.join(app.getPath('userData'), 'uploads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function getClinicSettings(): Promise<ClinicSettings> {
  const settingsPath = getSettingsPath();
  try {
    const raw = await fs.promises.readFile(settingsPath, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function updateClinicSettings(data: Partial<ClinicSettings>): Promise<ClinicSettings> {
  const current = await getClinicSettings();
  const updated: ClinicSettings = {
    ...current,
    name: data.name ?? current.name,
    address: data.address ?? current.address,
    phone: data.phone ?? current.phone,
    email: data.email ?? current.email,
  };
  await fs.promises.writeFile(getSettingsPath(), JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

export async function updateClinicLogo(filePath: string): Promise<ClinicSettings> {
  const ext = path.extname(filePath).toLowerCase();
  const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
  if (!allowedExts.includes(ext)) {
    throw new Error('Invalid image format. Allowed: PNG, JPG, GIF, BMP, WEBP');
  }

  const logoFilename = `clinic-logo${ext}`;
  const destPath = path.join(getUploadsDir(), logoFilename);

  // Remove old logo if it exists with a different extension
  const current = await getClinicSettings();
  if (current.logoFilename && current.logoFilename !== logoFilename) {
    const oldPath = path.join(getUploadsDir(), current.logoFilename);
    try {
      await fs.promises.unlink(oldPath);
    } catch {
      // ignore if old file doesn't exist
    }
  }

  await fs.promises.copyFile(filePath, destPath);

  const updated = await updateClinicSettings({});
  updated.logoFilename = logoFilename;
  await fs.promises.writeFile(getSettingsPath(), JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

export async function removeClinicLogo(): Promise<ClinicSettings> {
  const current = await getClinicSettings();
  if (current.logoFilename) {
    const logoPath = path.join(getUploadsDir(), current.logoFilename);
    try {
      await fs.promises.unlink(logoPath);
    } catch {
      // ignore if file doesn't exist
    }
  }

  const updated = { ...current };
  delete updated.logoFilename;
  await fs.promises.writeFile(getSettingsPath(), JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}
