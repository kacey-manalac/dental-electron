import { useForm } from 'react-hook-form';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';

interface PatientFormData {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  dateOfBirth: string;
  gender?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  notes?: string;
}

interface PatientFormProps {
  initialData?: Partial<PatientFormData>;
  onSubmit: (data: PatientFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

export default function PatientForm({ initialData, onSubmit, onCancel, isLoading }: PatientFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PatientFormData>({
    defaultValues: initialData,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="First Name"
          {...register('firstName', { required: 'First name is required' })}
          error={errors.firstName?.message}
          required
        />
        <Input
          label="Last Name"
          {...register('lastName', { required: 'Last name is required' })}
          error={errors.lastName?.message}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Email"
          type="email"
          {...register('email')}
          error={errors.email?.message}
        />
        <Input
          label="Phone"
          {...register('phone', { required: 'Phone is required' })}
          error={errors.phone?.message}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Date of Birth"
          type="date"
          {...register('dateOfBirth', { required: 'Date of birth is required' })}
          error={errors.dateOfBirth?.message}
          required
        />
        <Select
          label="Gender"
          options={GENDER_OPTIONS}
          {...register('gender')}
        />
      </div>

      <Input
        label="Address"
        {...register('address')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Emergency Contact"
          {...register('emergencyContact')}
        />
        <Input
          label="Emergency Phone"
          {...register('emergencyPhone')}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Insurance Provider"
          {...register('insuranceProvider')}
        />
        <Input
          label="Insurance Number"
          {...register('insuranceNumber')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes
        </label>
        <textarea
          {...register('notes')}
          rows={3}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={isLoading}>
          {initialData ? 'Update Patient' : 'Add Patient'}
        </Button>
      </div>
    </form>
  );
}
