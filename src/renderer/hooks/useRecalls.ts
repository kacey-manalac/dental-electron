import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import * as recallsService from '../services/recalls';
import { RecallType, RecallStatus } from '../types';

interface RecallFilters {
  page?: number;
  limit?: number;
  patientId?: string;
  status?: RecallStatus;
  recallType?: RecallType;
}

export function useRecalls(filters: RecallFilters = {}) {
  return useQuery({
    queryKey: ['recalls', filters],
    queryFn: () => recallsService.getRecalls(filters),
  });
}

export function useDueRecalls() {
  return useQuery({
    queryKey: ['recalls', 'due'],
    queryFn: recallsService.getDueRecalls,
  });
}

export function useCreateRecall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recallsService.createRecall,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recalls'] });
      toast.success('Recall schedule created');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create recall');
    },
  });
}

export function useUpdateRecall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof recallsService.updateRecall>[1] }) =>
      recallsService.updateRecall(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recalls'] });
      toast.success('Recall updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update recall');
    },
  });
}

export function useDeleteRecall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recallsService.deleteRecall,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recalls'] });
      toast.success('Recall deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete recall');
    },
  });
}
