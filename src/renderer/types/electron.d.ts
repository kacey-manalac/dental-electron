interface IpcResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ElectronAPI {
  patients: {
    list: (filters: any) => Promise<IpcResult>;
    get: (id: string) => Promise<IpcResult>;
    create: (data: any) => Promise<IpcResult>;
    update: (id: string, data: any) => Promise<IpcResult>;
    delete: (id: string) => Promise<IpcResult>;
    updateMedicalHistory: (id: string, data: any) => Promise<IpcResult>;
  };
  appointments: {
    list: (filters: any) => Promise<IpcResult>;
    get: (id: string) => Promise<IpcResult>;
    create: (data: any) => Promise<IpcResult>;
    update: (id: string, data: any) => Promise<IpcResult>;
    delete: (id: string) => Promise<IpcResult>;
  };
  treatments: {
    list: (filters: any) => Promise<IpcResult>;
    get: (id: string) => Promise<IpcResult>;
    create: (data: any) => Promise<IpcResult>;
    update: (id: string, data: any) => Promise<IpcResult>;
    delete: (id: string) => Promise<IpcResult>;
  };
  billing: {
    getInvoices: (filters: any) => Promise<IpcResult>;
    getInvoice: (id: string) => Promise<IpcResult>;
    createInvoice: (data: any) => Promise<IpcResult>;
    updateInvoice: (id: string, data: any) => Promise<IpcResult>;
    getPayments: (filters: any) => Promise<IpcResult>;
    createPayment: (data: any) => Promise<IpcResult>;
  };
  dentalChart: {
    get: (patientId: string) => Promise<IpcResult>;
    updateTooth: (patientId: string, toothNumber: number, data: any) => Promise<IpcResult>;
    addCondition: (patientId: string, toothNumber: number, data: any) => Promise<IpcResult>;
    updateSurfaces: (patientId: string, toothNumber: number, data: any) => Promise<IpcResult>;
  };
  images: {
    upload: (patientId: string, filePaths: string[], options: any) => Promise<IpcResult>;
    list: (patientId: string, filters: any) => Promise<IpcResult>;
    delete: (imageId: string) => Promise<IpcResult>;
  };
  reports: {
    dentalRecord: (patientId: string) => Promise<IpcResult>;
    invoice: (invoiceId: string) => Promise<IpcResult>;
    treatmentSummary: (patientId: string, options: any) => Promise<IpcResult>;
  };
  analytics: {
    dashboard: () => Promise<IpcResult>;
    treatments: (filters: any) => Promise<IpcResult>;
    revenue: (filters: any) => Promise<IpcResult>;
    patients: (filters: any) => Promise<IpcResult>;
    conditions: () => Promise<IpcResult>;
  };
  admin: {
    backup: () => Promise<IpcResult>;
    restore: (data: any) => Promise<IpcResult>;
    systemInfo: () => Promise<IpcResult>;
  };
  supplies: {
    list: (filters: any) => Promise<IpcResult>;
    get: (id: string) => Promise<IpcResult>;
    create: (data: any) => Promise<IpcResult>;
    update: (id: string, data: any) => Promise<IpcResult>;
    delete: (id: string) => Promise<IpcResult>;
    recordUsage: (data: any) => Promise<IpcResult>;
    recordRestock: (data: any) => Promise<IpcResult>;
    adjustStock: (data: any) => Promise<IpcResult>;
    dashboardStats: () => Promise<IpcResult>;
    lowStockAlerts: () => Promise<IpcResult>;
  };
  users: {
    getDentists: () => Promise<IpcResult>;
  };
  dialog: {
    openFiles: (options: any) => Promise<{ canceled: boolean; filePaths: string[] }>;
  };
  shell: {
    openPath: (filePath: string) => Promise<string>;
  };
  getFilePath: (file: File) => string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
