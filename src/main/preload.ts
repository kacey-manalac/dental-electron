import { contextBridge, ipcRenderer, webUtils } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Patients
  patients: {
    list: (filters: any) => ipcRenderer.invoke('patients:list', filters),
    get: (id: string) => ipcRenderer.invoke('patients:get', id),
    create: (data: any) => ipcRenderer.invoke('patients:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('patients:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('patients:delete', id),
    updateMedicalHistory: (id: string, data: any) => ipcRenderer.invoke('patients:updateMedicalHistory', id, data),
  },

  // Appointments
  appointments: {
    list: (filters: any) => ipcRenderer.invoke('appointments:list', filters),
    get: (id: string) => ipcRenderer.invoke('appointments:get', id),
    create: (data: any) => ipcRenderer.invoke('appointments:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('appointments:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('appointments:delete', id),
  },

  // Treatments
  treatments: {
    list: (filters: any) => ipcRenderer.invoke('treatments:list', filters),
    get: (id: string) => ipcRenderer.invoke('treatments:get', id),
    create: (data: any) => ipcRenderer.invoke('treatments:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('treatments:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('treatments:delete', id),
  },

  // Billing
  billing: {
    getInvoices: (filters: any) => ipcRenderer.invoke('billing:getInvoices', filters),
    getInvoice: (id: string) => ipcRenderer.invoke('billing:getInvoice', id),
    createInvoice: (data: any) => ipcRenderer.invoke('billing:createInvoice', data),
    updateInvoice: (id: string, data: any) => ipcRenderer.invoke('billing:updateInvoice', id, data),
    getPayments: (filters: any) => ipcRenderer.invoke('billing:getPayments', filters),
    createPayment: (data: any) => ipcRenderer.invoke('billing:createPayment', data),
  },

  // Dental Chart
  dentalChart: {
    get: (patientId: string) => ipcRenderer.invoke('dentalChart:get', patientId),
    updateTooth: (patientId: string, toothNumber: number, data: any) => ipcRenderer.invoke('dentalChart:updateTooth', patientId, toothNumber, data),
    addCondition: (patientId: string, toothNumber: number, data: any) => ipcRenderer.invoke('dentalChart:addCondition', patientId, toothNumber, data),
    updateSurfaces: (patientId: string, toothNumber: number, data: any) => ipcRenderer.invoke('dentalChart:updateSurfaces', patientId, toothNumber, data),
  },

  // Images
  images: {
    upload: (patientId: string, filePaths: string[], options: any) => ipcRenderer.invoke('images:upload', patientId, filePaths, options),
    list: (patientId: string, filters: any) => ipcRenderer.invoke('images:list', patientId, filters),
    delete: (imageId: string) => ipcRenderer.invoke('images:delete', imageId),
  },

  // Reports
  reports: {
    dentalRecord: (patientId: string) => ipcRenderer.invoke('reports:dentalRecord', patientId),
    invoice: (invoiceId: string) => ipcRenderer.invoke('reports:invoice', invoiceId),
    treatmentSummary: (patientId: string, options: any) => ipcRenderer.invoke('reports:treatmentSummary', patientId, options),
  },

  // Analytics
  analytics: {
    dashboard: () => ipcRenderer.invoke('analytics:dashboard'),
    treatments: (filters: any) => ipcRenderer.invoke('analytics:treatments', filters),
    revenue: (filters: any) => ipcRenderer.invoke('analytics:revenue', filters),
    patients: (filters: any) => ipcRenderer.invoke('analytics:patients', filters),
    conditions: () => ipcRenderer.invoke('analytics:conditions'),
  },

  // Admin
  admin: {
    backup: () => ipcRenderer.invoke('admin:backup'),
    restore: (filePath: string) => ipcRenderer.invoke('admin:restore', filePath),
    previewBackup: (filePath: string) => ipcRenderer.invoke('admin:previewBackup', filePath),
    systemInfo: () => ipcRenderer.invoke('admin:systemInfo'),
  },

  // Supplies
  supplies: {
    list: (filters: any) => ipcRenderer.invoke('supplies:list', filters),
    get: (id: string) => ipcRenderer.invoke('supplies:get', id),
    create: (data: any) => ipcRenderer.invoke('supplies:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('supplies:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('supplies:delete', id),
    recordUsage: (data: any) => ipcRenderer.invoke('supplies:recordUsage', data),
    recordRestock: (data: any) => ipcRenderer.invoke('supplies:recordRestock', data),
    adjustStock: (data: any) => ipcRenderer.invoke('supplies:adjustStock', data),
    dashboardStats: () => ipcRenderer.invoke('supplies:dashboardStats'),
    lowStockAlerts: () => ipcRenderer.invoke('supplies:lowStockAlerts'),
  },

  // Clinic Settings
  clinicSettings: {
    get: () => ipcRenderer.invoke('clinicSettings:get'),
    update: (data: any) => ipcRenderer.invoke('clinicSettings:update', data),
    updateLogo: (filePath: string) => ipcRenderer.invoke('clinicSettings:updateLogo', filePath),
    removeLogo: () => ipcRenderer.invoke('clinicSettings:removeLogo'),
  },

  // Users (for fetching dentists)
  users: {
    getDentists: () => ipcRenderer.invoke('users:getDentists'),
  },

  // Dialog
  dialog: {
    openFiles: (options: any) => ipcRenderer.invoke('dialog:openFiles', options),
  },

  // Shell
  shell: {
    openPath: (filePath: string) => ipcRenderer.invoke('shell:openPath', filePath),
  },

  // Utils
  getFilePath: (file: File) => webUtils.getPathForFile(file),
});
