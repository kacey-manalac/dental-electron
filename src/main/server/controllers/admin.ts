import { dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import { prisma } from '../utils/prisma';

export async function createBackup() {
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
  ]);

  const backup = {
    version: '1.0.0',
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
      },
      note: 'Passwords and actual image files are not included in this backup for security reasons.',
    },
  };

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
    defaultPath: `dental-clinic-backup-${new Date().toISOString().split('T')[0]}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (result.canceled || !result.filePath) {
    return { filePath: null };
  }

  await fs.promises.writeFile(result.filePath, JSON.stringify(backup, null, 2));
  return { filePath: result.filePath };
}

export async function restoreBackup(backup: any) {
  if (!backup || !backup.version || !backup.data) {
    throw new Error('Invalid backup file format');
  }

  if (backup.version !== '1.0.0') {
    throw new Error(`Unsupported backup version: ${backup.version}`);
  }

  const { data } = backup;

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

  const result = await prisma.$transaction(async (tx) => {
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

    return counts;
  });

  await prisma.auditLog.create({
    data: {
      userId: null,
      action: 'RESTORE',
      entityType: 'system',
      newValues: {
        backupDate: backup.exportedAt,
        restoredAt: new Date().toISOString(),
        counts: result,
      },
    },
  });

  return {
    message: 'Backup restored successfully',
    restoredCounts: result,
    backupDate: backup.exportedAt,
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
