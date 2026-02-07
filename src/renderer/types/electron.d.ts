import type {
  Patient,
  MedicalHistory,
  Appointment,
  AppointmentStatus,
  Treatment,
  TreatmentStatus,
  Invoice,
  InvoiceStatus,
  Payment,
  PaymentMethod,
  PaginatedResponse,
  DentalChartData,
  Tooth,
  ToothCondition,
  ToothSurface,
  PatientImage,
  DashboardStats,
  TreatmentAnalytics,
  RevenueAnalytics,
  PatientAnalytics,
  ConditionAnalytics,
  SystemInfo,
  BackupData,
  BackupPreviewInfo,
  Supply,
  StockTransaction,
  SupplyCategory,
  SupplyDashboardStats,
} from './index';

interface IpcResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// --- Filter types ---

interface PatientFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface AppointmentFilters {
  page?: number;
  limit?: number;
  search?: string;
  patientId?: string;
  dentistId?: string;
  status?: AppointmentStatus;
  startDate?: string;
  endDate?: string;
}

interface TreatmentFilters {
  page?: number;
  limit?: number;
  search?: string;
  patientId?: string;
  dentistId?: string;
  status?: TreatmentStatus;
}

interface InvoiceFilters {
  page?: number;
  limit?: number;
  search?: string;
  patientId?: string;
  status?: InvoiceStatus;
}

interface PaymentFilters {
  page?: number;
  limit?: number;
  invoiceId?: string;
  method?: PaymentMethod;
}

interface ImageFilters {
  page?: number;
  limit?: number;
  category?: string;
  toothId?: string;
}

interface SupplyFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: SupplyCategory;
  lowStockOnly?: boolean;
  isActive?: boolean;
}

// --- Create/Update data types ---

interface CreatePatientData {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  dateOfBirth: string;
  gender?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  notes?: string;
}

interface CreateAppointmentData {
  patientId: string;
  dentistId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status?: AppointmentStatus;
  notes?: string;
}

interface CreateTreatmentData {
  patientId: string;
  dentistId: string;
  appointmentId?: string;
  toothNumber?: number;
  procedureCode?: string;
  procedureName: string;
  description?: string;
  status?: TreatmentStatus;
  cost: number;
  notes?: string;
  performedAt?: string;
}

interface CreateInvoiceItem {
  treatmentId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface CreateInvoiceData {
  patientId: string;
  items: CreateInvoiceItem[];
  tax?: number;
  discount?: number;
  dueDate?: string;
  notes?: string;
}

interface UpdateInvoiceData {
  status?: InvoiceStatus;
  dueDate?: string;
  notes?: string;
  tax?: number;
  discount?: number;
}

interface CreatePaymentData {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

interface UpdateToothData {
  currentCondition: ToothCondition;
  mobility?: number;
  notes?: string;
}

interface AddConditionData {
  condition: ToothCondition;
  notes?: string;
}

interface UpdateSurfacesData {
  surfaces: {
    surface: ToothSurface;
    condition: ToothCondition;
    notes?: string;
  }[];
}

interface ImageUploadOptions {
  category?: string;
  description?: string;
  toothId?: string;
}

interface CreateSupplyData {
  name: string;
  category?: SupplyCategory;
  sku?: string;
  description?: string;
  unit?: string;
  currentStock?: number;
  minimumStock?: number;
  costPerUnit?: number;
  supplier?: string;
  location?: string;
  expiryDate?: string;
}

interface UpdateSupplyData {
  name?: string;
  category?: SupplyCategory;
  sku?: string;
  description?: string;
  unit?: string;
  minimumStock?: number;
  costPerUnit?: number;
  supplier?: string;
  location?: string;
  expiryDate?: string;
}

interface StockTransactionData {
  supplyId: string;
  quantity: number;
  notes?: string;
  reference?: string;
}

interface AdjustStockData {
  supplyId: string;
  newQuantity: number;
  notes?: string;
  reference?: string;
}

interface ClinicSettingsData {
  name: string;
  address: string;
  phone: string;
  email: string;
  logoFilename?: string;
}

interface ReportResult {
  filePath: string | null;
}

interface DialogOptions {
  filters?: { name: string; extensions: string[] }[];
  properties?: string[];
}

interface DentistInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// --- Main API interface ---

interface ElectronAPI {
  patients: {
    list: (filters: PatientFilters) => Promise<IpcResult<PaginatedResponse<Patient>>>;
    get: (id: string) => Promise<IpcResult<Patient>>;
    create: (data: CreatePatientData) => Promise<IpcResult<Patient>>;
    update: (id: string, data: Partial<CreatePatientData>) => Promise<IpcResult<Patient>>;
    delete: (id: string) => Promise<IpcResult<void>>;
    updateMedicalHistory: (id: string, data: Partial<MedicalHistory>) => Promise<IpcResult<MedicalHistory>>;
  };
  appointments: {
    list: (filters: AppointmentFilters) => Promise<IpcResult<PaginatedResponse<Appointment>>>;
    get: (id: string) => Promise<IpcResult<Appointment>>;
    create: (data: CreateAppointmentData) => Promise<IpcResult<Appointment>>;
    update: (id: string, data: Partial<CreateAppointmentData>) => Promise<IpcResult<Appointment>>;
    delete: (id: string) => Promise<IpcResult<void>>;
  };
  treatments: {
    list: (filters: TreatmentFilters) => Promise<IpcResult<PaginatedResponse<Treatment>>>;
    get: (id: string) => Promise<IpcResult<Treatment>>;
    create: (data: CreateTreatmentData) => Promise<IpcResult<Treatment>>;
    update: (id: string, data: Partial<CreateTreatmentData>) => Promise<IpcResult<Treatment>>;
    delete: (id: string) => Promise<IpcResult<void>>;
  };
  billing: {
    getInvoices: (filters: InvoiceFilters) => Promise<IpcResult<PaginatedResponse<Invoice>>>;
    getInvoice: (id: string) => Promise<IpcResult<Invoice>>;
    createInvoice: (data: CreateInvoiceData) => Promise<IpcResult<Invoice>>;
    updateInvoice: (id: string, data: UpdateInvoiceData) => Promise<IpcResult<Invoice>>;
    getPayments: (filters: PaymentFilters) => Promise<IpcResult<PaginatedResponse<Payment>>>;
    createPayment: (data: CreatePaymentData) => Promise<IpcResult<Payment>>;
  };
  dentalChart: {
    get: (patientId: string) => Promise<IpcResult<DentalChartData>>;
    updateTooth: (patientId: string, toothNumber: number, data: UpdateToothData) => Promise<IpcResult<Tooth>>;
    addCondition: (patientId: string, toothNumber: number, data: AddConditionData) => Promise<IpcResult<void>>;
    updateSurfaces: (patientId: string, toothNumber: number, data: UpdateSurfacesData) => Promise<IpcResult<Tooth>>;
  };
  images: {
    upload: (patientId: string, filePaths: string[], options: ImageUploadOptions) => Promise<IpcResult<PatientImage[]>>;
    list: (patientId: string, filters: ImageFilters) => Promise<IpcResult<PaginatedResponse<PatientImage>>>;
    delete: (imageId: string) => Promise<IpcResult<void>>;
  };
  reports: {
    dentalRecord: (patientId: string) => Promise<IpcResult<ReportResult>>;
    invoice: (invoiceId: string) => Promise<IpcResult<ReportResult>>;
    treatmentSummary: (patientId: string, options: { startDate?: string; endDate?: string }) => Promise<IpcResult<ReportResult>>;
  };
  analytics: {
    dashboard: () => Promise<IpcResult<DashboardStats>>;
    treatments: (filters: { startDate?: string; endDate?: string }) => Promise<IpcResult<TreatmentAnalytics>>;
    revenue: (filters: { months?: number }) => Promise<IpcResult<RevenueAnalytics>>;
    patients: (filters: { months?: number }) => Promise<IpcResult<PatientAnalytics>>;
    conditions: () => Promise<IpcResult<ConditionAnalytics>>;
  };
  admin: {
    backup: () => Promise<IpcResult<void>>;
    restore: (filePath: string) => Promise<IpcResult<{ message: string; restoredCounts: Record<string, number>; backupDate: string }>>;
    previewBackup: (filePath: string) => Promise<IpcResult<BackupPreviewInfo>>;
    systemInfo: () => Promise<IpcResult<SystemInfo>>;
  };
  supplies: {
    list: (filters: SupplyFilters) => Promise<IpcResult<PaginatedResponse<Supply>>>;
    get: (id: string) => Promise<IpcResult<Supply>>;
    create: (data: CreateSupplyData) => Promise<IpcResult<Supply>>;
    update: (id: string, data: UpdateSupplyData) => Promise<IpcResult<Supply>>;
    delete: (id: string) => Promise<IpcResult<{ success: boolean }>>;
    recordUsage: (data: StockTransactionData) => Promise<IpcResult<StockTransaction>>;
    recordRestock: (data: StockTransactionData) => Promise<IpcResult<StockTransaction>>;
    adjustStock: (data: AdjustStockData) => Promise<IpcResult<StockTransaction>>;
    dashboardStats: () => Promise<IpcResult<SupplyDashboardStats>>;
    lowStockAlerts: () => Promise<IpcResult<Supply[]>>;
  };
  clinicSettings: {
    get: () => Promise<IpcResult<ClinicSettingsData>>;
    update: (data: Partial<ClinicSettingsData>) => Promise<IpcResult<ClinicSettingsData>>;
    updateLogo: (filePath: string) => Promise<IpcResult<ClinicSettingsData>>;
    removeLogo: () => Promise<IpcResult<ClinicSettingsData>>;
  };
  users: {
    getDentists: () => Promise<IpcResult<DentistInfo[]>>;
  };
  dialog: {
    openFiles: (options: DialogOptions) => Promise<{ canceled: boolean; filePaths: string[] }>;
  };
  shell: {
    openPath: (filePath: string) => Promise<string>;
    openExternal: (url: string) => Promise<void>;
  };
  getFilePath: (file: File) => string;
}

declare const __APP_VERSION__: string;

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
