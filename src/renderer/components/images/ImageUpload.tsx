import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudArrowUpIcon, XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import Button from '../common/Button';
import { useUploadImages } from '../../hooks/useImages';
import { ImageCategory } from '../../types';

interface ImageUploadProps {
  patientId: string;
  toothId?: string;
  onSuccess?: () => void;
}

const CATEGORY_OPTIONS: { value: ImageCategory; label: string }[] = [
  { value: 'xray', label: 'X-Ray' },
  { value: 'photo', label: 'Photo' },
  { value: 'general', label: 'General' },
];

export default function ImageUpload({ patientId, toothId, onSuccess }: ImageUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<ImageCategory>('general');
  const [description, setDescription] = useState('');

  const uploadMutation = useUploadImages();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles].slice(0, 5));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    await uploadMutation.mutateAsync({
      patientId,
      data: {
        images: files,
        category,
        description: description || undefined,
        toothId,
      },
    });

    setFiles([]);
    setDescription('');
    onSuccess?.();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
        }`}
      >
        <input {...getInputProps()} />
        <CloudArrowUpIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {isDragActive
            ? 'Drop the files here...'
            : 'Drag & drop images here, or click to select'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          JPEG, PNG, GIF, WebP up to 10MB (max 5 files)
        </p>
      </div>

      {/* Selected files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Selected files ({files.length}/5)
          </p>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md"
              >
                <div className="flex items-center space-x-3">
                  <PhotoIcon className="w-8 h-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-[200px]">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category and description */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ImageCategory)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Upload button */}
      <div className="flex justify-end">
        <Button
          onClick={handleUpload}
          disabled={files.length === 0}
          loading={uploadMutation.isPending}
        >
          Upload {files.length > 0 ? `(${files.length})` : ''}
        </Button>
      </div>
    </div>
  );
}
