import { useState } from 'react';
import { Tooth, ToothCondition, ToothSurface } from '../../types';
import { useUIStore } from '../../store/uiStore';
import { useDentalChart, useUpdateTooth, useUpdateToothSurfaces } from '../../hooks/useDentalChart';
import ToothSVG from './ToothSVG';
import ToothConditionPanel from './ToothConditionPanel';
import DentalOverview from './DentalOverview';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';

interface DentalChartProps {
  patientId: string;
}

// FDI to Universal mapping
const FDI_NUMBERS: Record<number, string> = {
  1: '18', 2: '17', 3: '16', 4: '15', 5: '14', 6: '13', 7: '12', 8: '11',
  9: '21', 10: '22', 11: '23', 12: '24', 13: '25', 14: '26', 15: '27', 16: '28',
  17: '38', 18: '37', 19: '36', 20: '35', 21: '34', 22: '33', 23: '32', 24: '31',
  25: '41', 26: '42', 27: '43', 28: '44', 29: '45', 30: '46', 31: '47', 32: '48',
};

export default function DentalChart({ patientId }: DentalChartProps) {
  const { dentalNotation, setDentalNotation } = useUIStore();
  const { data, isLoading, error } = useDentalChart(patientId);
  const updateTooth = useUpdateTooth();
  const updateSurfaces = useUpdateToothSurfaces();

  const [selectedTooth, setSelectedTooth] = useState<Tooth | null>(null);
  const [showSurfaceView, setShowSurfaceView] = useState(false);
  const [selectedSurface, setSelectedSurface] = useState<ToothSurface | null>(null);
  const [showConditionModal, setShowConditionModal] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12 text-red-500">
        Failed to load dental chart
      </div>
    );
  }

  const { teeth, summary } = data;

  const getToothByNumber = (num: number): Tooth | undefined => {
    return teeth.find((t) => t.toothNumber === num);
  };

  const getDisplayNumber = (universalNum: number): string => {
    if (dentalNotation === 'fdi') {
      return FDI_NUMBERS[universalNum] || universalNum.toString();
    }
    return universalNum.toString();
  };

  const handleToothClick = (tooth: Tooth) => {
    setSelectedTooth(tooth);
    setSelectedSurface(null);
    setShowConditionModal(true);
  };

  const handleConditionSelect = async (condition: ToothCondition) => {
    if (!selectedTooth) return;

    if (selectedSurface) {
      // Update specific surface
      await updateSurfaces.mutateAsync({
        patientId,
        toothNumber: selectedTooth.toothNumber,
        surfaces: [{ surface: selectedSurface, condition }],
      });
    } else {
      // Update whole tooth
      await updateTooth.mutateAsync({
        patientId,
        toothNumber: selectedTooth.toothNumber,
        data: { currentCondition: condition },
      });
    }

    setShowConditionModal(false);
    setSelectedTooth(null);
    setSelectedSurface(null);
  };

  const handleSurfaceClick = (tooth: Tooth, surface: ToothSurface) => {
    setSelectedTooth(tooth);
    setSelectedSurface(surface);
    setShowConditionModal(true);
  };

  // Upper teeth: 1-16 (right to left when viewing patient)
  const upperTeeth = Array.from({ length: 16 }, (_, i) => i + 1);
  // Lower teeth: 32-17 (right to left when viewing patient)
  const lowerTeeth = Array.from({ length: 16 }, (_, i) => 32 - i);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Notation:</span>
            <div className="flex rounded-md shadow-sm">
              <button
                onClick={() => setDentalNotation('fdi')}
                className={`px-3 py-1.5 text-sm font-medium rounded-l-md border ${
                  dentalNotation === 'fdi'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
                }`}
              >
                FDI
              </button>
              <button
                onClick={() => setDentalNotation('universal')}
                className={`px-3 py-1.5 text-sm font-medium rounded-r-md border-t border-r border-b ${
                  dentalNotation === 'universal'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
                }`}
              >
                Universal
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">View:</span>
            <div className="flex rounded-md shadow-sm">
              <button
                onClick={() => setShowSurfaceView(false)}
                className={`px-3 py-1.5 text-sm font-medium rounded-l-md border ${
                  !showSurfaceView
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
                }`}
              >
                Simple
              </button>
              <button
                onClick={() => setShowSurfaceView(true)}
                className={`px-3 py-1.5 text-sm font-medium rounded-r-md border-t border-r border-b ${
                  showSurfaceView
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
                }`}
              >
                Surfaces
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overview */}
      {summary && <DentalOverview summary={summary} />}

      {/* Dental Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {/* Upper Arch */}
        <div className="mb-2">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-2">Upper Arch</div>
          <div className="flex justify-center items-end space-x-1">
            {/* Right side (patient's right = our left) */}
            <div className="flex space-x-1">
              {upperTeeth.slice(0, 8).map((num) => {
                const tooth = getToothByNumber(num);
                return (
                  <div key={num} className="flex flex-col items-center">
                    <span className="text-xs text-gray-500 mb-1">{getDisplayNumber(num)}</span>
                    <ToothSVG
                      toothNumber={num}
                      condition={tooth?.currentCondition || 'HEALTHY'}
                      surfaces={tooth?.surfaces}
                      isSelected={selectedTooth?.toothNumber === num}
                      onClick={() => tooth && handleToothClick(tooth)}
                      onSurfaceClick={(surface) => tooth && handleSurfaceClick(tooth, surface)}
                      showSurfaces={showSurfaceView}
                    />
                  </div>
                );
              })}
            </div>
            <div className="w-px h-16 bg-gray-300 dark:bg-gray-600 mx-2" />
            {/* Left side (patient's left = our right) */}
            <div className="flex space-x-1">
              {upperTeeth.slice(8).map((num) => {
                const tooth = getToothByNumber(num);
                return (
                  <div key={num} className="flex flex-col items-center">
                    <span className="text-xs text-gray-500 mb-1">{getDisplayNumber(num)}</span>
                    <ToothSVG
                      toothNumber={num}
                      condition={tooth?.currentCondition || 'HEALTHY'}
                      surfaces={tooth?.surfaces}
                      isSelected={selectedTooth?.toothNumber === num}
                      onClick={() => tooth && handleToothClick(tooth)}
                      onSurfaceClick={(surface) => tooth && handleSurfaceClick(tooth, surface)}
                      showSurfaces={showSurfaceView}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Midline */}
        <div className="border-t border-gray-200 dark:border-gray-600 my-4" />

        {/* Lower Arch */}
        <div>
          <div className="flex justify-center items-start space-x-1">
            {/* Right side */}
            <div className="flex space-x-1">
              {lowerTeeth.slice(0, 8).map((num) => {
                const tooth = getToothByNumber(num);
                return (
                  <div key={num} className="flex flex-col items-center">
                    <ToothSVG
                      toothNumber={num}
                      condition={tooth?.currentCondition || 'HEALTHY'}
                      surfaces={tooth?.surfaces}
                      isSelected={selectedTooth?.toothNumber === num}
                      onClick={() => tooth && handleToothClick(tooth)}
                      onSurfaceClick={(surface) => tooth && handleSurfaceClick(tooth, surface)}
                      showSurfaces={showSurfaceView}
                    />
                    <span className="text-xs text-gray-500 mt-1">{getDisplayNumber(num)}</span>
                  </div>
                );
              })}
            </div>
            <div className="w-px h-16 bg-gray-300 dark:bg-gray-600 mx-2" />
            {/* Left side */}
            <div className="flex space-x-1">
              {lowerTeeth.slice(8).map((num) => {
                const tooth = getToothByNumber(num);
                return (
                  <div key={num} className="flex flex-col items-center">
                    <ToothSVG
                      toothNumber={num}
                      condition={tooth?.currentCondition || 'HEALTHY'}
                      surfaces={tooth?.surfaces}
                      isSelected={selectedTooth?.toothNumber === num}
                      onClick={() => tooth && handleToothClick(tooth)}
                      onSurfaceClick={(surface) => tooth && handleSurfaceClick(tooth, surface)}
                      showSurfaces={showSurfaceView}
                    />
                    <span className="text-xs text-gray-500 mt-1">{getDisplayNumber(num)}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">Lower Arch</div>
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="flex flex-wrap justify-center gap-4 text-xs">
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-white border border-gray-300 mr-1" />
              Healthy
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-red-500 mr-1" />
              Cavity
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-blue-500 mr-1" />
              Filled
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-yellow-500 mr-1" />
              Crown
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-gray-400 mr-1" />
              Missing
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-purple-500 mr-1" />
              Implant
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-orange-500 mr-1" />
              Root Canal
            </div>
          </div>
        </div>
      </div>

      {/* Condition Selection Modal */}
      <Modal
        isOpen={showConditionModal}
        onClose={() => {
          setShowConditionModal(false);
          setSelectedTooth(null);
          setSelectedSurface(null);
        }}
        title={
          selectedTooth
            ? `Tooth ${getDisplayNumber(selectedTooth.toothNumber)}${
                selectedSurface ? ` - Surface ${selectedSurface}` : ''
              }`
            : 'Select Condition'
        }
        size="sm"
      >
        <ToothConditionPanel
          selectedCondition={selectedTooth?.currentCondition}
          onConditionSelect={handleConditionSelect}
        />
      </Modal>
    </div>
  );
}
