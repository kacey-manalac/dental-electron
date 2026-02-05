import { unwrap } from './api';
import { PatientImage, PaginatedResponse } from '../types';

interface ImageFilters {
  page?: number;
  limit?: number;
  category?: string;
  toothId?: string;
}

interface UploadImageData {
  images: File[];
  category?: string;
  description?: string;
  toothId?: string;
}

export async function getPatientImages(
  patientId: string,
  filters: ImageFilters = {}
): Promise<PaginatedResponse<PatientImage>> {
  return unwrap(await window.electronAPI.images.list(patientId, filters));
}

export async function uploadImages(
  patientId: string,
  data: UploadImageData
): Promise<PatientImage[]> {
  // Extract absolute file paths using Electron's webUtils API
  const filePaths = data.images.map((file: File) => window.electronAPI.getFilePath(file));
  return unwrap(await window.electronAPI.images.upload(patientId, filePaths, {
    category: data.category,
    description: data.description,
    toothId: data.toothId,
  }));
}

export function getImageUrl(storedName: string): string {
  return `local-image://${storedName}`;
}

export async function deleteImage(imageId: string): Promise<void> {
  unwrap(await window.electronAPI.images.delete(imageId));
}
