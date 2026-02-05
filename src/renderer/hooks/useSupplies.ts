import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import * as suppliesService from '../services/supplies';
import { SupplyCategory } from '../types';

interface SupplyFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: SupplyCategory;
  lowStockOnly?: boolean;
  isActive?: boolean;
}

export function useSupplies(filters: SupplyFilters = {}) {
  return useQuery({
    queryKey: ['supplies', filters],
    queryFn: () => suppliesService.getSupplies(filters),
  });
}

export function useSupply(id: string) {
  return useQuery({
    queryKey: ['supply', id],
    queryFn: () => suppliesService.getSupply(id),
    enabled: !!id,
  });
}

export function useCreateSupply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: suppliesService.createSupply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies'] });
      queryClient.invalidateQueries({ queryKey: ['supplyDashboardStats'] });
      toast.success('Supply created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create supply');
    },
  });
}

export function useUpdateSupply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof suppliesService.updateSupply>[1] }) =>
      suppliesService.updateSupply(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['supplies'] });
      queryClient.invalidateQueries({ queryKey: ['supply', id] });
      queryClient.invalidateQueries({ queryKey: ['supplyDashboardStats'] });
      toast.success('Supply updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update supply');
    },
  });
}

export function useDeleteSupply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: suppliesService.deleteSupply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies'] });
      queryClient.invalidateQueries({ queryKey: ['supplyDashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['lowStockAlerts'] });
      toast.success('Supply deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete supply');
    },
  });
}

export function useRecordUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: suppliesService.recordUsage,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['supplies'] });
      queryClient.invalidateQueries({ queryKey: ['supply', variables.supplyId] });
      queryClient.invalidateQueries({ queryKey: ['supplyDashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['lowStockAlerts'] });
      toast.success('Usage recorded');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to record usage');
    },
  });
}

export function useRecordRestock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: suppliesService.recordRestock,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['supplies'] });
      queryClient.invalidateQueries({ queryKey: ['supply', variables.supplyId] });
      queryClient.invalidateQueries({ queryKey: ['supplyDashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['lowStockAlerts'] });
      toast.success('Restock recorded');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to record restock');
    },
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: suppliesService.adjustStock,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['supplies'] });
      queryClient.invalidateQueries({ queryKey: ['supply', variables.supplyId] });
      queryClient.invalidateQueries({ queryKey: ['supplyDashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['lowStockAlerts'] });
      toast.success('Stock adjusted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to adjust stock');
    },
  });
}

export function useSupplyDashboardStats() {
  return useQuery({
    queryKey: ['supplyDashboardStats'],
    queryFn: suppliesService.getSupplyDashboardStats,
  });
}

export function useLowStockAlerts() {
  return useQuery({
    queryKey: ['lowStockAlerts'],
    queryFn: suppliesService.getLowStockAlerts,
  });
}
