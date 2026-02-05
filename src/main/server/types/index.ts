export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ResolvedPaginationParams {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export type ToothSurfaceType = 'M' | 'O' | 'D' | 'B' | 'L';

export const TOOTH_SURFACES: ToothSurfaceType[] = ['M', 'O', 'D', 'B', 'L'];

export const FDI_TO_UNIVERSAL: Record<string, number> = {
  '18': 1, '17': 2, '16': 3, '15': 4, '14': 5, '13': 6, '12': 7, '11': 8,
  '21': 9, '22': 10, '23': 11, '24': 12, '25': 13, '26': 14, '27': 15, '28': 16,
  '38': 17, '37': 18, '36': 19, '35': 20, '34': 21, '33': 22, '32': 23, '31': 24,
  '41': 25, '42': 26, '43': 27, '44': 28, '45': 29, '46': 30, '47': 31, '48': 32,
};

export const UNIVERSAL_TO_FDI: Record<number, string> = Object.fromEntries(
  Object.entries(FDI_TO_UNIVERSAL).map(([fdi, universal]) => [universal, fdi])
);
