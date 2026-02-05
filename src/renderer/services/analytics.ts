import { unwrap } from './api';
import {
  DashboardStats,
  TreatmentAnalytics,
  RevenueAnalytics,
  PatientAnalytics,
  ConditionAnalytics,
} from '../types';

export async function getDashboardStats(): Promise<DashboardStats> {
  return unwrap(await window.electronAPI.analytics.dashboard());
}

export async function getTreatmentAnalytics(
  startDate?: string,
  endDate?: string
): Promise<TreatmentAnalytics> {
  return unwrap(await window.electronAPI.analytics.treatments({ startDate, endDate }));
}

export async function getRevenueAnalytics(months?: number): Promise<RevenueAnalytics> {
  return unwrap(await window.electronAPI.analytics.revenue({ months }));
}

export async function getPatientAnalytics(months?: number): Promise<PatientAnalytics> {
  return unwrap(await window.electronAPI.analytics.patients({ months }));
}

export async function getConditionAnalytics(): Promise<ConditionAnalytics> {
  return unwrap(await window.electronAPI.analytics.conditions());
}
