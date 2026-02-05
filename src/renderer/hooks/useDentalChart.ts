import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import * as dentalChartService from '../services/dentalChart';
import { ToothCondition, ToothSurface } from '../types';

export function useDentalChart(patientId: string) {
  return useQuery({
    queryKey: ['dentalChart', patientId],
    queryFn: () => dentalChartService.getDentalChart(patientId),
    enabled: !!patientId,
  });
}

export function useUpdateTooth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      patientId,
      toothNumber,
      data,
    }: {
      patientId: string;
      toothNumber: number;
      data: { currentCondition: ToothCondition; notes?: string };
    }) => dentalChartService.updateTooth(patientId, toothNumber, data),
    onSuccess: (_, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: ['dentalChart', patientId] });
      toast.success('Tooth updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update tooth');
    },
  });
}

export function useAddToothCondition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      patientId,
      toothNumber,
      data,
    }: {
      patientId: string;
      toothNumber: number;
      data: { condition: ToothCondition; notes?: string };
    }) => dentalChartService.addToothCondition(patientId, toothNumber, data),
    onSuccess: (_, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: ['dentalChart', patientId] });
      toast.success('Condition recorded');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to record condition');
    },
  });
}

export function useUpdateToothSurfaces() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      patientId,
      toothNumber,
      surfaces,
    }: {
      patientId: string;
      toothNumber: number;
      surfaces: { surface: ToothSurface; condition: ToothCondition; notes?: string }[];
    }) => dentalChartService.updateToothSurfaces(patientId, toothNumber, surfaces),
    onSuccess: (_, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: ['dentalChart', patientId] });
      toast.success('Surfaces updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update surfaces');
    },
  });
}
