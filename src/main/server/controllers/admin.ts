import { dialog, BrowserWindow, app } from 'electron';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import AdmZip from 'adm-zip';
import { prisma } from '../utils/prisma';

function getUploadsDir(): string {
  return path.join(app.getPath('userData'), 'uploads');
}

function getClinicSettingsPath(): string {
  return path.join(app.getPath('userData'), 'clinic-settings.json');
}

async function buildBackupData() {
  const [
    users,
    patients,
    medicalHistories,
    teeth,
    toothConditionHistories,
    toothSurfaces,
    appointments,
    treatments,
    invoices,
    invoiceItems,
    payments,
    patientImages,
    auditLogs,
    supplies,
    stockTransactions,
    procedureCatalog,
    recallSchedules,
    procedureSupplies,
  ] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.patient.findMany(),
    prisma.medicalHistory.findMany(),
    prisma.tooth.findMany(),
    prisma.toothConditionHistory.findMany(),
    prisma.toothSurface.findMany(),
    prisma.appointment.findMany(),
    prisma.treatment.findMany(),
    prisma.invoice.findMany(),
    prisma.invoiceItem.findMany(),
    prisma.payment.findMany(),
    prisma.patientImage.findMany({
      select: {
        id: true,
        patientId: true,
        toothId: true,
        filename: true,
        storedName: true,
        mimeType: true,
        size: true,
        category: true,
        description: true,
        uploadedBy: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.auditLog.findMany({ take: 1000, orderBy: { createdAt: 'desc' } }),
    prisma.supply.findMany(),
    prisma.stockTransaction.findMany(),
    prisma.procedureCatalog.findMany(),
    prisma.recallSchedule.findMany(),
    prisma.procedureSupply.findMany(),
  ]);

  return {
    version: '3.0.0',
    exportedAt: new Date().toISOString(),
    exportedBy: 'local',
    data: {
      users,
      patients,
      medicalHistories,
      teeth,
      toothConditionHistories,
      toothSurfaces,
      appointments,
      treatments,
      invoices,
      invoiceItems,
      payments,
      patientImages,
      auditLogs,
      supplies,
      stockTransactions,
      procedureCatalog,
      recallSchedules,
      procedureSupplies,
    },
    metadata: {
      counts: {
        users: users.length,
        patients: patients.length,
        teeth: teeth.length,
        appointments: appointments.length,
        treatments: treatments.length,
        invoices: invoices.length,
        payments: payments.length,
        images: patientImages.length,
        supplies: supplies.length,
        procedureCatalog: procedureCatalog.length,
        recallSchedules: recallSchedules.length,
      },
      note: 'Full backup including database records, patient images, and clinic settings.',
    },
  };
}

export async function createBackup() {
  const backup = await buildBackupData();

  await prisma.auditLog.create({
    data: {
      userId: null,
      action: 'BACKUP',
      entityType: 'system',
      newValues: { timestamp: backup.exportedAt, counts: backup.metadata.counts },
    },
  });

  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showSaveDialog(win!, {
    defaultPath: `dental-clinic-backup-${new Date().toISOString().split('T')[0]}.zip`,
    filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
  });

  if (result.canceled || !result.filePath) {
    return { filePath: null };
  }

  // Create ZIP archive
  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(result.filePath!);
    const archive = archiver('zip', { zlib: { level: 6 } });

    output.on('close', () => resolve());
    archive.on('error', (err: Error) => reject(err));

    archive.pipe(output);

    // Add backup.json
    archive.append(JSON.stringify(backup, null, 2), { name: 'backup.json' });

    // Add uploads directory if it exists
    const uploadsDir = getUploadsDir();
    if (fs.existsSync(uploadsDir)) {
      archive.directory(uploadsDir, 'uploads');
    }

    // Add clinic-settings.json if it exists
    const settingsPath = getClinicSettingsPath();
    if (fs.existsSync(settingsPath)) {
      archive.file(settingsPath, { name: 'clinic-settings.json' });
    }

    archive.finalize();
  });

  return { filePath: result.filePath };
}

async function restoreDbData(data: any, exportedAt: string) {
  const result = await prisma.$transaction(async (tx) => {
    // Delete in reverse dependency order
    await tx.procedureSupply.deleteMany();
    await tx.stockTransaction.deleteMany();
    await tx.recallSchedule.deleteMany();
    await tx.payment.deleteMany();
    await tx.invoiceItem.deleteMany();
    await tx.invoice.deleteMany();
    await tx.treatment.deleteMany();
    await tx.appointment.deleteMany();
    await tx.toothSurface.deleteMany();
    await tx.toothConditionHistory.deleteMany();
    await tx.tooth.deleteMany();
    await tx.medicalHistory.deleteMany();
    await tx.patientImage.deleteMany();
    await tx.patient.deleteMany();
    await tx.supply.deleteMany();
    await tx.procedureCatalog.deleteMany();

    const counts: Record<string, number> = {};

    if (data.patients?.length > 0) {
      await tx.patient.createMany({ data: data.patients });
      counts.patients = data.patients.length;
    }

    if (data.medicalHistories?.length > 0) {
      await tx.medicalHistory.createMany({ data: data.medicalHistories });
      counts.medicalHistories = data.medicalHistories.length;
    }

    if (data.teeth?.length > 0) {
      await tx.tooth.createMany({ data: data.teeth });
      counts.teeth = data.teeth.length;
    }

    if (data.toothConditionHistories?.length > 0) {
      await tx.toothConditionHistory.createMany({ data: data.toothConditionHistories });
      counts.toothConditionHistories = data.toothConditionHistories.length;
    }

    if (data.toothSurfaces?.length > 0) {
      await tx.toothSurface.createMany({ data: data.toothSurfaces });
      counts.toothSurfaces = data.toothSurfaces.length;
    }

    if (data.appointments?.length > 0) {
      await tx.appointment.createMany({ data: data.appointments });
      counts.appointments = data.appointments.length;
    }

    if (data.treatments?.length > 0) {
      await tx.treatment.createMany({ data: data.treatments });
      counts.treatments = data.treatments.length;
    }

    if (data.invoices?.length > 0) {
      await tx.invoice.createMany({ data: data.invoices });
      counts.invoices = data.invoices.length;
    }

    if (data.invoiceItems?.length > 0) {
      await tx.invoiceItem.createMany({ data: data.invoiceItems });
      counts.invoiceItems = data.invoiceItems.length;
    }

    if (data.payments?.length > 0) {
      await tx.payment.createMany({ data: data.payments });
      counts.payments = data.payments.length;
    }

    if (data.patientImages?.length > 0) {
      await tx.patientImage.createMany({ data: data.patientImages });
      counts.patientImages = data.patientImages.length;
    }

    // New models (may be absent in older v2.0.0 backups)
    if (data.supplies?.length > 0) {
      await tx.supply.createMany({ data: data.supplies });
      counts.supplies = data.supplies.length;
    }

    if (data.stockTransactions?.length > 0) {
      await tx.stockTransaction.createMany({ data: data.stockTransactions });
      counts.stockTransactions = data.stockTransactions.length;
    }

    if (data.procedureCatalog?.length > 0) {
      await tx.procedureCatalog.createMany({ data: data.procedureCatalog });
      counts.procedureCatalog = data.procedureCatalog.length;
    }

    if (data.recallSchedules?.length > 0) {
      await tx.recallSchedule.createMany({ data: data.recallSchedules });
      counts.recallSchedules = data.recallSchedules.length;
    }

    if (data.procedureSupplies?.length > 0) {
      await tx.procedureSupply.createMany({ data: data.procedureSupplies });
      counts.procedureSupplies = data.procedureSupplies.length;
    }

    return counts;
  });

  await prisma.auditLog.create({
    data: {
      userId: null,
      action: 'RESTORE',
      entityType: 'system',
      newValues: {
        backupDate: exportedAt,
        restoredAt: new Date().toISOString(),
        counts: result,
      },
    },
  });

  return result;
}

export async function restoreBackup(filePath: string) {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path');
  }

  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.zip') {
    return restoreFromZip(filePath);
  } else if (ext === '.json') {
    return restoreFromJson(filePath);
  } else {
    throw new Error('Unsupported backup file format. Please use .zip or .json files.');
  }
}

async function restoreFromJson(filePath: string) {
  const raw = await fs.promises.readFile(filePath, 'utf-8');
  const backup = JSON.parse(raw);

  if (!backup || !backup.version || !backup.data) {
    throw new Error('Invalid backup file format');
  }

  if (!['1.0.0', '2.0.0', '3.0.0'].includes(backup.version)) {
    throw new Error(`Unsupported backup version: ${backup.version}`);
  }

  validateBackupData(backup.data);

  const counts = await restoreDbData(backup.data, backup.exportedAt);

  return {
    message: 'Backup restored successfully (database only)',
    restoredCounts: counts,
    backupDate: backup.exportedAt,
  };
}

async function restoreFromZip(filePath: string) {
  const zip = new AdmZip(filePath);

  // Extract and parse backup.json
  const backupEntry = zip.getEntry('backup.json');
  if (!backupEntry) {
    throw new Error('Invalid backup archive: missing backup.json');
  }

  const backup = JSON.parse(backupEntry.getData().toString('utf-8'));

  if (!backup || !backup.version || !backup.data) {
    throw new Error('Invalid backup file format');
  }

  if (!['1.0.0', '2.0.0', '3.0.0'].includes(backup.version)) {
    throw new Error(`Unsupported backup version: ${backup.version}`);
  }

  validateBackupData(backup.data);

  // Restore DB data
  const counts = await restoreDbData(backup.data, backup.exportedAt);

  // Restore uploaded images
  const uploadsDir = getUploadsDir();
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  let imagesRestored = 0;
  for (const entry of zip.getEntries()) {
    if (entry.entryName.startsWith('uploads/') && !entry.isDirectory) {
      const safeName = path.basename(entry.entryName);
      if (!safeName || safeName.startsWith('.')) continue;
      const destPath = path.join(uploadsDir, safeName);
      fs.writeFileSync(destPath, entry.getData());
      imagesRestored++;
    }
  }

  // Restore clinic-settings.json
  let clinicSettingsRestored = false;
  const settingsEntry = zip.getEntry('clinic-settings.json');
  if (settingsEntry) {
    const settingsPath = getClinicSettingsPath();
    fs.writeFileSync(settingsPath, settingsEntry.getData());
    clinicSettingsRestored = true;
  }

  return {
    message: `Backup restored successfully${imagesRestored > 0 ? ` (${imagesRestored} image files restored)` : ''}${clinicSettingsRestored ? ', clinic settings restored' : ''}`,
    restoredCounts: counts,
    backupDate: backup.exportedAt,
  };
}

function validateBackupData(data: any) {
  const requiredTables = [
    'patients',
    'medicalHistories',
    'teeth',
    'appointments',
    'treatments',
    'invoices',
  ];

  for (const table of requiredTables) {
    if (!Array.isArray(data[table])) {
      throw new Error(`Missing or invalid data for: ${table}`);
    }
  }
}

export async function previewBackup(filePath: string) {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path');
  }

  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.zip') {
    return previewZipBackup(filePath);
  } else if (ext === '.json') {
    return previewJsonBackup(filePath);
  } else {
    throw new Error('Unsupported backup file format. Please use .zip or .json files.');
  }
}

async function previewJsonBackup(filePath: string) {
  const raw = await fs.promises.readFile(filePath, 'utf-8');
  const backup = JSON.parse(raw);

  if (!backup || !backup.version || !backup.data) {
    throw new Error('Invalid backup file format');
  }

  return {
    version: backup.version,
    exportedAt: backup.exportedAt,
    metadata: backup.metadata,
    hasImages: false,
    imageCount: 0,
    hasClinicSettings: false,
  };
}

async function previewZipBackup(filePath: string) {
  const zip = new AdmZip(filePath);

  const backupEntry = zip.getEntry('backup.json');
  if (!backupEntry) {
    throw new Error('Invalid backup archive: missing backup.json');
  }

  const backup = JSON.parse(backupEntry.getData().toString('utf-8'));

  if (!backup || !backup.version || !backup.data) {
    throw new Error('Invalid backup file format');
  }

  // Count image files in uploads/
  let imageCount = 0;
  for (const entry of zip.getEntries()) {
    if (entry.entryName.startsWith('uploads/') && !entry.isDirectory) {
      imageCount++;
    }
  }

  const hasClinicSettings = zip.getEntry('clinic-settings.json') !== null;

  return {
    version: backup.version,
    exportedAt: backup.exportedAt,
    metadata: backup.metadata,
    hasImages: imageCount > 0,
    imageCount,
    hasClinicSettings,
  };
}

export async function getSystemInfo() {
  const [
    userCount,
    patientCount,
    appointmentCount,
    treatmentCount,
    invoiceCount,
    imageCount,
    lastBackup,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.patient.count(),
    prisma.appointment.count(),
    prisma.treatment.count(),
    prisma.invoice.count(),
    prisma.patientImage.count(),
    prisma.auditLog.findFirst({
      where: { action: 'BACKUP' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ]);

  return {
    database: {
      users: userCount,
      patients: patientCount,
      appointments: appointmentCount,
      treatments: treatmentCount,
      invoices: invoiceCount,
      images: imageCount,
    },
    lastBackup: lastBackup?.createdAt || null,
    serverTime: new Date().toISOString(),
  };
}
