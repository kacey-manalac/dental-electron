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
    deleteSeries: (seriesId: string) => ipcRenderer.invoke('appointments:deleteSeries', seriesId),
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
    patientBalance: (patientId: string) => ipcRenderer.invoke('billing:patientBalance', patientId),
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
    receipt: (invoiceId: string) => ipcRenderer.invoke('reports:receipt', invoiceId),
    accountStatement: (patientId: string) => ipcRenderer.invoke('reports:accountStatement', patientId),
  },

  // Analytics
  analytics: {
    dashboard: () => ipcRenderer.invoke('analytics:dashboard'),
    treatments: (filters: any) => ipcRenderer.invoke('analytics:treatments', filters),
    revenue: (filters: any) => ipcRenderer.invoke('analytics:revenue', filters),
    patients: (filters: any) => ipcRenderer.invoke('analytics:patients', filters),
    conditions: () => ipcRenderer.invoke('analytics:conditions'),
    alerts: () => ipcRenderer.invoke('analytics:alerts'),
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

  // Procedures
  procedures: {
    list: (filters: any) => ipcRenderer.invoke('procedures:list', filters),
    get: (id: string) => ipcRenderer.invoke('procedures:get', id),
    create: (data: any) => ipcRenderer.invoke('procedures:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('procedures:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('procedures:delete', id),
    active: () => ipcRenderer.invoke('procedures:active'),
    getSupplies: (procedureCatalogId: string) => ipcRenderer.invoke('procedures:getSupplies', procedureCatalogId),
    addSupply: (data: any) => ipcRenderer.invoke('procedures:addSupply', data),
    removeSupply: (id: string) => ipcRenderer.invoke('procedures:removeSupply', id),
  },

  // Recalls
  recalls: {
    list: (filters: any) => ipcRenderer.invoke('recalls:list', filters),
    create: (data: any) => ipcRenderer.invoke('recalls:create', data),
    update: (id: string, data: any) => ipcRenderer.invoke('recalls:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('recalls:delete', id),
    due: () => ipcRenderer.invoke('recalls:due'),
  },

  // Exports
  exports: {
    patients: () => ipcRenderer.invoke('exports:patients'),
    appointments: () => ipcRenderer.invoke('exports:appointments'),
    treatments: () => ipcRenderer.invoke('exports:treatments'),
    invoices: () => ipcRenderer.invoke('exports:invoices'),
    supplies: () => ipcRenderer.invoke('exports:supplies'),
  },

  // Search
  search: {
    global: (query: string) => ipcRenderer.invoke('search:global', query),
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
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  },

  // Utils
  getFilePath: (file: File) => webUtils.getPathForFile(file),
});
