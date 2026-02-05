import { unwrap } from './api';
import { Supply, StockTransaction, PaginatedResponse, SupplyCategory, SupplyDashboardStats } from '../types';

interface SupplyFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: SupplyCategory;
  lowStockOnly?: boolean;
  isActive?: boolean;
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

export async function getSupplies(filters: SupplyFilters = {}): Promise<PaginatedResponse<Supply>> {
  return unwrap(await window.electronAPI.supplies.list(filters));
}

export async function getSupply(id: string): Promise<Supply> {
  return unwrap(await window.electronAPI.supplies.get(id));
}

export async function createSupply(data: CreateSupplyData): Promise<Supply> {
  return unwrap(await window.electronAPI.supplies.create(data));
}

export async function updateSupply(id: string, data: UpdateSupplyData): Promise<Supply> {
  return unwrap(await window.electronAPI.supplies.update(id, data));
}

export async function deleteSupply(id: string): Promise<{ success: boolean }> {
  return unwrap(await window.electronAPI.supplies.delete(id));
}

export async function recordUsage(data: StockTransactionData): Promise<StockTransaction> {
  return unwrap(await window.electronAPI.supplies.recordUsage(data));
}

export async function recordRestock(data: StockTransactionData): Promise<StockTransaction> {
  return unwrap(await window.electronAPI.supplies.recordRestock(data));
}

export async function adjustStock(data: AdjustStockData): Promise<StockTransaction> {
  return unwrap(await window.electronAPI.supplies.adjustStock(data));
}

export async function getSupplyDashboardStats(): Promise<SupplyDashboardStats> {
  return unwrap(await window.electronAPI.supplies.dashboardStats());
}

export async function getLowStockAlerts(): Promise<Supply[]> {
  return unwrap(await window.electronAPI.supplies.lowStockAlerts());
}
