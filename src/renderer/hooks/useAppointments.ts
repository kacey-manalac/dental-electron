import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import * as appointmentService from '../services/appointments';
import { AppointmentStatus } from '../types';

interface AppointmentFilters {
  page?: number;
  limit?: number;
  search?: string;
  patientId?: string;
  dentistId?: string;
  status?: AppointmentStatus;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useAppointments(filters: AppointmentFilters = {}) {
  return useQuery({
    queryKey: ['appointments', filters],
    queryFn: () => appointmentService.getAppointments(filters),
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: ['appointment', id],
    queryFn: () => appointmentService.getAppointment(id),
    enabled: !!id,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: appointmentService.createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create appointment');
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof appointmentService.updateAppointment>[1] }) =>
      appointmentService.updateAppointment(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment', id] });
      toast.success('Appointment updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update appointment');
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: appointmentService.deleteAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cancel appointment');
    },
  });
}
