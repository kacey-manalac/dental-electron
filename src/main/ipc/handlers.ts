import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import { ZodError } from 'zod';
import { Prisma } from '../generated/client';

import * as patients from '../server/controllers/patients';
import * as appointments from '../server/controllers/appointments';
import * as treatments from '../server/controllers/treatments';
import * as billing from '../server/controllers/billing';
import * as dentalChart from '../server/controllers/dentalChart';
import * as images from '../server/controllers/images';
import * as reports from '../server/controllers/reports';
import * as analytics from '../server/controllers/analytics';
import * as admin from '../server/controllers/admin';
import * as supplies from '../server/controllers/supplies';
import * as clinicSettings from '../server/controllers/clinicSettings';

type IpcResult<T = any> = { success: true; data: T } | { success: false; error: string };

function wrapHandler<T>(fn: (...args: any[]) => Promise<T>) {
  return async (_event: Electron.IpcMainInvokeEvent, ...args: any[]): Promise<IpcResult<T>> => {
    try {
      const data = await fn(...args);
      return { success: true, data };
    } catch (err: any) {
      console.error('IPC handler error:', err);

      if (err instanceof ZodError) {
        const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        return { success: false, error: messages.join(', ') };
      }

      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        switch (err.code) {
          case 'P2002':
            return { success: false, error: 'A record with this value already exists' };
          case 'P2025':
            return { success: false, error: 'Record not found' };
          case 'P2003':
            return { success: false, error: 'Foreign key constraint failed' };
          default:
            return { success: false, error: 'Database error' };
        }
      }

      return { success: false, error: err.message || 'Unknown error' };
    }
  };
}

export function registerAllHandlers() {
  // Patients
  ipcMain.handle('patients:list', wrapHandler(patients.getPatients));
  ipcMain.handle('patients:get', wrapHandler(patients.getPatient));
  ipcMain.handle('patients:create', wrapHandler(patients.createPatient));
  ipcMain.handle('patients:update', wrapHandler(patients.updatePatient));
  ipcMain.handle('patients:delete', wrapHandler(patients.deletePatient));
  ipcMain.handle('patients:updateMedicalHistory', wrapHandler(patients.updateMedicalHistory));

  // Appointments
  ipcMain.handle('appointments:list', wrapHandler(appointments.getAppointments));
  ipcMain.handle('appointments:get', wrapHandler(appointments.getAppointment));
  ipcMain.handle('appointments:create', wrapHandler(appointments.createAppointment));
  ipcMain.handle('appointments:update', wrapHandler(appointments.updateAppointment));
  ipcMain.handle('appointments:delete', wrapHandler(appointments.deleteAppointment));

  // Treatments
  ipcMain.handle('treatments:list', wrapHandler(treatments.getTreatments));
  ipcMain.handle('treatments:get', wrapHandler(treatments.getTreatment));
  ipcMain.handle('treatments:create', wrapHandler(treatments.createTreatment));
  ipcMain.handle('treatments:update', wrapHandler(treatments.updateTreatment));
  ipcMain.handle('treatments:delete', wrapHandler(treatments.deleteTreatment));

  // Billing
  ipcMain.handle('billing:getInvoices', wrapHandler(billing.getInvoices));
  ipcMain.handle('billing:getInvoice', wrapHandler(billing.getInvoice));
  ipcMain.handle('billing:createInvoice', wrapHandler(billing.createInvoice));
  ipcMain.handle('billing:updateInvoice', wrapHandler(billing.updateInvoice));
  ipcMain.handle('billing:getPayments', wrapHandler(billing.getPayments));
  ipcMain.handle('billing:createPayment', wrapHandler(billing.createPayment));

  // Dental Chart
  ipcMain.handle('dentalChart:get', wrapHandler(dentalChart.getDentalChart));
  ipcMain.handle('dentalChart:updateTooth', wrapHandler(dentalChart.updateTooth));
  ipcMain.handle('dentalChart:addCondition', wrapHandler(dentalChart.addToothCondition));
  ipcMain.handle('dentalChart:updateSurfaces', wrapHandler(dentalChart.updateToothSurfaces));

  // Images
  ipcMain.handle('images:upload', wrapHandler(images.uploadImages));
  ipcMain.handle('images:list', wrapHandler(images.getPatientImages));
  ipcMain.handle('images:delete', wrapHandler(images.deleteImage));

  // Reports
  ipcMain.handle('reports:dentalRecord', wrapHandler(reports.generateDentalRecordPDF));
  ipcMain.handle('reports:invoice', wrapHandler(reports.generateInvoicePDF));
  ipcMain.handle('reports:treatmentSummary', wrapHandler(reports.generateTreatmentSummaryPDF));

  // Analytics
  ipcMain.handle('analytics:dashboard', wrapHandler(analytics.getDashboardStats));
  ipcMain.handle('analytics:treatments', wrapHandler(analytics.getTreatmentAnalytics));
  ipcMain.handle('analytics:revenue', wrapHandler(analytics.getRevenueAnalytics));
  ipcMain.handle('analytics:patients', wrapHandler(analytics.getPatientAnalytics));
  ipcMain.handle('analytics:conditions', wrapHandler(analytics.getConditionAnalytics));

  // Admin
  ipcMain.handle('admin:backup', wrapHandler(admin.createBackup));
  ipcMain.handle('admin:restore', wrapHandler(admin.restoreBackup));
  ipcMain.handle('admin:previewBackup', wrapHandler(admin.previewBackup));
  ipcMain.handle('admin:systemInfo', wrapHandler(admin.getSystemInfo));

  // Supplies
  ipcMain.handle('supplies:list', wrapHandler(supplies.getSupplies));
  ipcMain.handle('supplies:get', wrapHandler(supplies.getSupply));
  ipcMain.handle('supplies:create', wrapHandler(supplies.createSupply));
  ipcMain.handle('supplies:update', wrapHandler(supplies.updateSupply));
  ipcMain.handle('supplies:delete', wrapHandler(supplies.deleteSupply));
  ipcMain.handle('supplies:recordUsage', wrapHandler(supplies.recordUsage));
  ipcMain.handle('supplies:recordRestock', wrapHandler(supplies.recordRestock));
  ipcMain.handle('supplies:adjustStock', wrapHandler(supplies.adjustStock));
  ipcMain.handle('supplies:dashboardStats', wrapHandler(supplies.getSupplyDashboardStats));
  ipcMain.handle('supplies:lowStockAlerts', wrapHandler(supplies.getLowStockAlerts));

  // Clinic Settings
  ipcMain.handle('clinicSettings:get', wrapHandler(clinicSettings.getClinicSettings));
  ipcMain.handle('clinicSettings:update', wrapHandler(clinicSettings.updateClinicSettings));
  ipcMain.handle('clinicSettings:updateLogo', wrapHandler(clinicSettings.updateClinicLogo));
  ipcMain.handle('clinicSettings:removeLogo', wrapHandler(clinicSettings.removeClinicLogo));

  // Dentists (for appointment/treatment forms)
  ipcMain.handle('users:getDentists', wrapHandler(async () => {
    const { prisma } = require('../server/utils/prisma');
    return prisma.user.findMany({
      where: { role: 'DENTIST', isActive: true },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
  }));

  // Dialog
  ipcMain.handle('dialog:openFiles', async (_event, options: { filters?: { name: string; extensions: string[] }[]; properties?: string[] }) => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win!, {
      filters: options.filters,
      properties: (options.properties || ['openFile', 'multiSelections']) as any,
    });
    return result;
  });

  // Shell
  ipcMain.handle('shell:openPath', async (_event, filePath: string) => {
    return shell.openPath(filePath);
  });

  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    await shell.openExternal(url);
  });
}
