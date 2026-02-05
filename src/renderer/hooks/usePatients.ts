import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import * as patientService from '../services/patients';
import { Patient, MedicalHistory } from '../types';

interface PatientFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function usePatients(filters: PatientFilters = {}) {
  return useQuery({
    queryKey: ['patients', filters],
    queryFn: () => patientService.getPatients(filters),
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: () => patientService.getPatient(id),
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: patientService.createPatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast.success('Patient created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create patient');
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Patient> }) =>
      patientService.updatePatient(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patient', id] });
      toast.success('Patient updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update patient');
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: patientService.deletePatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      toast.success('Patient deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete patient');
    },
  });
}

export function useUpdateMedicalHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, data }: { patientId: string; data: Partial<MedicalHistory> }) =>
      patientService.updateMedicalHistory(patientId, data),
    onSuccess: (_, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      toast.success('Medical history updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update medical history');
    },
  });
}
