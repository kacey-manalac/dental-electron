import { useState } from 'react';

interface DateRangeFilterProps {
  onRangeChange: (startDate: string | undefined, endDate: string | undefined) => void;
  onMonthsChange?: (months: number) => void;
  showMonthsSelector?: boolean;
}

const PRESET_RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 3 months', days: 90 },
  { label: 'Last 6 months', days: 180 },
  { label: 'Last year', days: 365 },
  { label: 'All time', days: 0 },
];

const MONTH_OPTIONS = [3, 6, 12, 24];

export default function DateRangeFilter({
  onRangeChange,
  onMonthsChange,
  showMonthsSelector = false,
}: DateRangeFilterProps) {
  const [selectedPreset, setSelectedPreset] = useState(2); // Default to 3 months
  const [selectedMonths, setSelectedMonths] = useState(12);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const handlePresetChange = (index: number) => {
    setSelectedPreset(index);
    setShowCustom(false);

    const preset = PRESET_RANGES[index];
    if (preset.days === 0) {
      onRangeChange(undefined, undefined);
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - preset.days);
      onRangeChange(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
    }
  };

  const handleMonthsChange = (months: number) => {
    setSelectedMonths(months);
    onMonthsChange?.(months);
  };

  const handleCustomDateChange = () => {
    if (customStart || customEnd) {
      onRangeChange(customStart || undefined, customEnd || undefined);
    }
  };

  if (showMonthsSelector) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">Show:</span>
        <div className="flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600">
          {MONTH_OPTIONS.map((months) => (
            <button
              key={months}
              onClick={() => handleMonthsChange(months)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedMonths === months
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {months}mo
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1">
        {PRESET_RANGES.map((preset, index) => (
          <button
            key={preset.label}
            onClick={() => handlePresetChange(index)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              selectedPreset === index && !showCustom
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            showCustom
              ? 'bg-primary-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          Custom
        </button>
      </div>

      {/* Custom date inputs */}
      {showCustom && (
        <div className="flex items-center gap-2 mt-2 w-full sm:w-auto sm:mt-0">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
          />
          <button
            onClick={handleCustomDateChange}
            className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary-600 text-white hover:bg-primary-700"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
