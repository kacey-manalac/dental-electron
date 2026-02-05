import { unwrap } from './api';
import { DentalChartData, Tooth, ToothCondition, ToothSurface } from '../types';

interface UpdateToothData {
  currentCondition: ToothCondition;
  mobility?: number;
  notes?: string;
}

interface SurfaceUpdate {
  surface: ToothSurface;
  condition: ToothCondition;
  notes?: string;
}

export async function getDentalChart(patientId: string): Promise<DentalChartData> {
  return unwrap(await window.electronAPI.dentalChart.get(patientId));
}

export async function updateTooth(patientId: string, toothNumber: number, data: UpdateToothData): Promise<Tooth> {
  return unwrap(await window.electronAPI.dentalChart.updateTooth(patientId, toothNumber, data));
}

export async function addToothCondition(
  patientId: string,
  toothNumber: number,
  data: { condition: ToothCondition; notes?: string }
): Promise<void> {
  unwrap(await window.electronAPI.dentalChart.addCondition(patientId, toothNumber, data));
}

export async function updateToothSurfaces(
  patientId: string,
  toothNumber: number,
  surfaces: SurfaceUpdate[]
): Promise<Tooth> {
  return unwrap(await window.electronAPI.dentalChart.updateSurfaces(patientId, toothNumber, { surfaces }));
}
