import { useQuery } from '@tanstack/react-query';
import * as analyticsService from '../services/analytics';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: analyticsService.getDashboardStats,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
}

export function useTreatmentAnalytics(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['treatment-analytics', startDate, endDate],
    queryFn: () => analyticsService.getTreatmentAnalytics(startDate, endDate),
  });
}

export function useRevenueAnalytics(months?: number) {
  return useQuery({
    queryKey: ['revenue-analytics', months],
    queryFn: () => analyticsService.getRevenueAnalytics(months),
  });
}

export function usePatientAnalytics(months?: number) {
  return useQuery({
    queryKey: ['patient-analytics', months],
    queryFn: () => analyticsService.getPatientAnalytics(months),
  });
}

export function useConditionAnalytics() {
  return useQuery({
    queryKey: ['condition-analytics'],
    queryFn: analyticsService.getConditionAnalytics,
  });
}
