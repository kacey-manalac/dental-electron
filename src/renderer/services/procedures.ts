import { unwrap } from './api';
import { ProcedureCatalog, ProcedureCategory, PaginatedResponse, ProcedureSupplyLink } from '../types';

interface ProcedureFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: ProcedureCategory;
  isActive?: boolean;
}

interface CreateProcedureData {
  name: string;
  code?: string;
  description?: string;
  defaultCost: number;
  category?: ProcedureCategory;
  estimatedDuration?: number;
}

export async function getProcedures(filters: ProcedureFilters = {}): Promise<PaginatedResponse<ProcedureCatalog>> {
  return unwrap(await window.electronAPI.procedures.list(filters));
}

export async function getProcedure(id: string): Promise<ProcedureCatalog> {
  return unwrap(await window.electronAPI.procedures.get(id));
}

export async function createProcedure(data: CreateProcedureData): Promise<ProcedureCatalog> {
  return unwrap(await window.electronAPI.procedures.create(data));
}

export async function updateProcedure(id: string, data: Partial<CreateProcedureData>): Promise<ProcedureCatalog> {
  return unwrap(await window.electronAPI.procedures.update(id, data));
}

export async function deleteProcedure(id: string): Promise<void> {
  unwrap(await window.electronAPI.procedures.delete(id));
}

export async function getActiveProcedures(): Promise<ProcedureCatalog[]> {
  return unwrap(await window.electronAPI.procedures.active());
}

export async function getProcedureSupplies(procedureCatalogId: string): Promise<ProcedureSupplyLink[]> {
  return unwrap(await window.electronAPI.procedures.getSupplies(procedureCatalogId));
}

export async function addProcedureSupply(data: { procedureCatalogId: string; supplyId: string; quantityUsed: number }): Promise<ProcedureSupplyLink> {
  return unwrap(await window.electronAPI.procedures.addSupply(data));
}

export async function removeProcedureSupply(id: string): Promise<void> {
  unwrap(await window.electronAPI.procedures.removeSupply(id));
}
