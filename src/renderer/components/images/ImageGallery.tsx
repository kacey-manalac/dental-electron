import { useState } from 'react';
import { TrashIcon, XMarkIcon, MagnifyingGlassPlusIcon } from '@heroicons/react/24/outline';
import Modal from '../common/Modal';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';
import { PatientImage } from '../../types';
import { getImageUrl } from '../../services/images';
import { useDeleteImage } from '../../hooks/useImages';

interface ImageGalleryProps {
  images: PatientImage[];
  isLoading?: boolean;
  patientId: string;
}

export default function ImageGallery({ images, isLoading, patientId }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<PatientImage | null>(null);
  const [deleteConfirmImage, setDeleteConfirmImage] = useState<PatientImage | null>(null);

  const deleteMutation = useDeleteImage();

  const handleDelete = async () => {
    if (!deleteConfirmImage) return;

    await deleteMutation.mutateAsync({
      imageId: deleteConfirmImage.id,
      patientId,
    });

    setDeleteConfirmImage(null);
    if (selectedImage?.id === deleteConfirmImage.id) {
      setSelectedImage(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'xray':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'photo':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>No images uploaded yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image) => (
          <div
            key={image.id}
            className="group relative bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden aspect-square"
          >
            <img
              src={getImageUrl(image.storedName)}
              alt={image.filename}
              className="w-full h-full object-cover"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setSelectedImage(image)}
                  className="p-2 bg-white/90 rounded-full mr-2 hover:bg-white"
                >
                  <MagnifyingGlassPlusIcon className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  onClick={() => setDeleteConfirmImage(image)}
                  className="p-2 bg-white/90 rounded-full hover:bg-white"
                >
                  <TrashIcon className="w-5 h-5 text-red-600" />
                </button>
              </div>
            </div>

            {/* Category badge */}
            <div className="absolute top-2 left-2">
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded ${getCategoryBadgeColor(
                  image.category
                )}`}
              >
                {image.category}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      <Modal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        size="xl"
        title={selectedImage?.filename}
      >
        {selectedImage && (
          <div className="space-y-4">
            <div className="flex justify-center bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
              <img
                src={getImageUrl(selectedImage.storedName)}
                alt={selectedImage.filename}
                className="max-h-[60vh] object-contain"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Category</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">
                  {selectedImage.category}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Uploaded</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatDate(selectedImage.createdAt)}
                </p>
              </div>
              {selectedImage.description && (
                <div className="col-span-2">
                  <p className="text-gray-500 dark:text-gray-400">Description</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedImage.description}
                  </p>
                </div>
              )}
              {selectedImage.uploader && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Uploaded by</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedImage.uploader.firstName} {selectedImage.uploader.lastName}
                  </p>
                </div>
              )}
              {selectedImage.tooth && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Tooth</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    #{selectedImage.tooth.toothNumber}
                    {selectedImage.tooth.fdiNumber && ` (FDI: ${selectedImage.tooth.fdiNumber})`}
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="danger" onClick={() => setDeleteConfirmImage(selectedImage)}>
                Delete
              </Button>
              <Button variant="secondary" onClick={() => setSelectedImage(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmImage}
        onClose={() => setDeleteConfirmImage(null)}
        title="Delete Image"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete "{deleteConfirmImage?.filename}"? This action cannot be
            undone.
          </p>
          <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={() => setDeleteConfirmImage(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleteMutation.isPending}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
