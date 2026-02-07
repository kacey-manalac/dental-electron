import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import * as proceduresService from '../services/procedures';
import { ProcedureCategory } from '../types';

interface ProcedureFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: ProcedureCategory;
  isActive?: boolean;
}

export function useProcedures(filters: ProcedureFilters = {}) {
  return useQuery({
    queryKey: ['procedures', filters],
    queryFn: () => proceduresService.getProcedures(filters),
  });
}

export function useProcedure(id: string) {
  return useQuery({
    queryKey: ['procedure', id],
    queryFn: () => proceduresService.getProcedure(id),
    enabled: !!id,
  });
}

export function useActiveProcedures() {
  return useQuery({
    queryKey: ['procedures', 'active'],
    queryFn: proceduresService.getActiveProcedures,
  });
}

export function useCreateProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: proceduresService.createProcedure,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
      toast.success('Procedure created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create procedure');
    },
  });
}

export function useUpdateProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof proceduresService.updateProcedure>[1] }) =>
      proceduresService.updateProcedure(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
      queryClient.invalidateQueries({ queryKey: ['procedure', id] });
      toast.success('Procedure updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update procedure');
    },
  });
}

export function useDeleteProcedure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: proceduresService.deleteProcedure,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
      toast.success('Procedure deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete procedure');
    },
  });
}

export function useProcedureSupplies(procedureCatalogId: string) {
  return useQuery({
    queryKey: ['procedureSupplies', procedureCatalogId],
    queryFn: () => proceduresService.getProcedureSupplies(procedureCatalogId),
    enabled: !!procedureCatalogId,
  });
}

export function useAddProcedureSupply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: proceduresService.addProcedureSupply,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['procedureSupplies', variables.procedureCatalogId] });
      toast.success('Supply linked');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to link supply');
    },
  });
}

export function useRemoveProcedureSupply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: proceduresService.removeProcedureSupply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedureSupplies'] });
      toast.success('Supply unlinked');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to unlink supply');
    },
  });
}
