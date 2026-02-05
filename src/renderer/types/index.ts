export type UserRole = 'ADMIN' | 'DENTIST' | 'ASSISTANT';

export type ToothCondition = 'HEALTHY' | 'CAVITY' | 'FILLED' | 'CROWN' | 'MISSING' | 'IMPLANT' | 'ROOT_CANAL';

export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export type TreatmentStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'INSURANCE' | 'BANK_TRANSFER';

export type ToothSurface = 'M' | 'O' | 'D' | 'B' | 'L';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
}

export interface Patient {
  id: string;
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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  medicalHistory?: MedicalHistory;
  teeth?: Tooth[];
  appointments?: Appointment[];
  _count?: {
    appointments: number;
    treatments: number;
  };
}

export interface MedicalHistory {
  id: string;
  patientId: string;
  allergies?: string;
  medications?: string;
  medicalConditions?: string;
  previousSurgeries?: string;
  smokingStatus?: string;
  alcoholConsumption?: string;
  bloodType?: string;
  lastDentalVisit?: string;
  notes?: string;
}

export interface Tooth {
  id: string;
  patientId: string;
  toothNumber: number;
  fdiNumber?: string;
  isAdult: boolean;
  currentCondition: ToothCondition;
  notes?: string;
  surfaces: ToothSurfaceData[];
  conditions: ToothConditionHistory[];
}

export interface ToothSurfaceData {
  id: string;
  toothId: string;
  surface: ToothSurface;
  condition: ToothCondition;
  notes?: string;
}

export interface ToothConditionHistory {
  id: string;
  toothId: string;
  condition: ToothCondition;
  notes?: string;
  recordedAt: string;
  recordedBy?: string;
}

export interface DentalChartData {
  patient: {
    id: string;
    firstName: string;
    lastName: string;
  };
  teeth: Tooth[];
  summary?: {
    total: number;
    healthy: number;
    cavities: number;
    filled: number;
    crowns: number;
    missing: number;
    implants: number;
    rootCanals: number;
  };
}

export interface Appointment {
  id: string;
  patientId: string;
  dentistId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  dentist?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface Treatment {
  id: string;
  patientId: string;
  dentistId: string;
  appointmentId?: string;
  toothNumber?: number;
  procedureCode?: string;
  procedureName: string;
  description?: string;
  status: TreatmentStatus;
  cost: number;
  notes?: string;
  performedAt?: string;
  createdAt: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  dentist?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface Invoice {
  id: string;
  patientId: string;
  invoiceNumber: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: InvoiceStatus;
  dueDate?: string;
  notes?: string;
  createdAt: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  items?: InvoiceItem[];
  payments?: Payment[];
  paidAmount?: number;
  balance?: number;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  treatmentId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  paidAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export type NotationType = 'universal' | 'fdi';

export type ImageCategory = 'xray' | 'photo' | 'general';

export interface PatientImage {
  id: string;
  patientId: string;
  toothId?: string;
  filename: string;
  storedName: string;
  mimeType: string;
  size: number;
  category: ImageCategory;
  description?: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  uploader?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  tooth?: {
    id: string;
    toothNumber: number;
    fdiNumber?: string;
  };
}

export interface DashboardStats {
  patients: {
    total: number;
    newThisMonth: number;
    growth: number;
  };
  appointments: {
    total: number;
    thisMonth: number;
    upcoming: number;
  };
  treatments: {
    completedThisMonth: number;
  };
  revenue: {
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };
  billing: {
    pendingInvoices: number;
  };
}

export interface TreatmentAnalytics {
  byProcedure: {
    procedure: string;
    count: number;
    totalRevenue: number;
  }[];
  byStatus: {
    status: TreatmentStatus;
    count: number;
  }[];
}

export interface RevenueAnalytics {
  monthly: {
    month: string;
    revenue: number;
    payments: number;
  }[];
  byMethod: {
    method: PaymentMethod;
    total: number;
    count: number;
  }[];
}

export interface PatientAnalytics {
  monthly: {
    month: string;
    newPatients: number;
    totalActive: number;
  }[];
  byGender: {
    gender: string;
    count: number;
  }[];
  byAge: {
    range: string;
    count: number;
  }[];
}

export interface ConditionAnalytics {
  byCondition: {
    condition: ToothCondition;
    count: number;
  }[];
  mostAffectedTeeth: {
    toothNumber: number;
    affectedCount: number;
  }[];
  bySurface: {
    surface: ToothSurface;
    condition: ToothCondition;
    count: number;
  }[];
}

export interface SystemInfo {
  database: {
    users: number;
    patients: number;
    appointments: number;
    treatments: number;
    invoices: number;
    images: number;
  };
  lastBackup: string | null;
  serverTime: string;
}

export interface BackupData {
  version: string;
  exportedAt: string;
  exportedBy: string;
  data: Record<string, unknown[]>;
  metadata: {
    counts: Record<string, number>;
    note: string;
  };
}
