import { ToothCondition } from '../../types';

interface ToothConditionPanelProps {
  selectedCondition?: ToothCondition;
  onConditionSelect: (condition: ToothCondition) => void;
  onClose?: () => void;
}

const CONDITIONS: { value: ToothCondition; label: string; color: string; description: string }[] = [
  { value: 'HEALTHY', label: 'Healthy', color: 'bg-white border-gray-300', description: 'Normal tooth' },
  { value: 'CAVITY', label: 'Cavity', color: 'bg-red-500', description: 'Tooth decay' },
  { value: 'FILLED', label: 'Filled', color: 'bg-blue-500', description: 'Restored tooth' },
  { value: 'CROWN', label: 'Crown', color: 'bg-yellow-500', description: 'Crown placed' },
  { value: 'MISSING', label: 'Missing', color: 'bg-gray-400', description: 'Extracted/absent' },
  { value: 'IMPLANT', label: 'Implant', color: 'bg-purple-500', description: 'Dental implant' },
  { value: 'ROOT_CANAL', label: 'Root Canal', color: 'bg-orange-500', description: 'Endodontic treatment' },
];

export default function ToothConditionPanel({
  selectedCondition,
  onConditionSelect,
  onClose,
}: ToothConditionPanelProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-64">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Select Condition</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div className="space-y-2">
        {CONDITIONS.map((condition) => (
          <button
            key={condition.value}
            onClick={() => onConditionSelect(condition.value)}
            className={`w-full flex items-center p-2 rounded-md transition-colors ${
              selectedCondition === condition.value
                ? 'bg-primary-50 dark:bg-primary-900/30 ring-2 ring-primary-500'
                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full ${condition.color} border flex-shrink-0`}
            />
            <div className="ml-3 text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {condition.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {condition.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
