import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import * as imageService from '../services/images';

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

export function usePatientImages(patientId: string, filters: ImageFilters = {}) {
  return useQuery({
    queryKey: ['patient-images', patientId, filters],
    queryFn: () => imageService.getPatientImages(patientId, filters),
    enabled: !!patientId,
  });
}

export function useUploadImages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, data }: { patientId: string; data: UploadImageData }) =>
      imageService.uploadImages(patientId, data),
    onSuccess: (_, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: ['patient-images', patientId] });
      toast.success('Images uploaded successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload images');
    },
  });
}

export function useDeleteImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ imageId, patientId }: { imageId: string; patientId: string }) =>
      imageService.deleteImage(imageId),
    onSuccess: (_, { patientId }) => {
      queryClient.invalidateQueries({ queryKey: ['patient-images', patientId] });
      toast.success('Image deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete image');
    },
  });
}
