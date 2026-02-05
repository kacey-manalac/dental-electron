import { useEffect, useRef } from 'react';
import { Tooth } from '../../types';
import { useDentalChart } from '../../hooks/useDentalChart';
import { updateTooth, updateToothSurfaces } from '../../services/dentalChart';
import DentalChartEngine, { ChartData, ChartToothData } from './DentalChartEngine';
import DentalOverview from './DentalOverview';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  CHART_TO_DB, DB_TO_CHART, SURFACE_TO_DB, DB_TO_SURFACE,
  WHOLE_TOOTH_CONDITIONS, FDI_TO_UNIVERSAL, UNIVERSAL_TO_FDI,
} from '../../utils/dental';
import './dental-chart.css';

interface DentalChartProps {
  patientId: string;
}

function convertDbToChart(teeth: Tooth[]): ChartData {
  const chartTeeth: Record<number, ChartToothData> = {};

  // Initialize all FDI teeth with defaults
  const allFdi = [
    18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
    48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38
  ];
  allFdi.forEach(fdi => {
    chartTeeth[fdi] = {
      status: 'present',
      wholeCondition: null,
      surfaces: {
        buccal: 'healthy', lingual: 'healthy',
        mesial: 'healthy', distal: 'healthy',
        occlusal: 'healthy'
      },
      mobility: 0,
      note: ''
    };
  });

  // Populate from DB data
  teeth.forEach(tooth => {
    const fdiStr = UNIVERSAL_TO_FDI[tooth.toothNumber];
    if (!fdiStr) return;
    const fdi = parseInt(fdiStr);
    const ct = chartTeeth[fdi];
    if (!ct) return;

    // Map whole-tooth condition
    const dbCond = tooth.currentCondition;
    if (WHOLE_TOOTH_CONDITIONS.includes(dbCond)) {
      ct.wholeCondition = DB_TO_CHART[dbCond] || null;
    }

    // Map surfaces
    if (tooth.surfaces) {
      tooth.surfaces.forEach(s => {
        const surfName = DB_TO_SURFACE[s.surface];
        if (surfName && s.condition !== 'HEALTHY') {
          ct.surfaces[surfName] = DB_TO_CHART[s.condition] || 'healthy';
        }
      });
    }

    ct.mobility = tooth.mobility || 0;
    ct.note = tooth.notes || '';
  });

  return { teeth: chartTeeth, history: [] };
}

export default function DentalChart({ patientId }: DentalChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<DentalChartEngine | null>(null);
  const initializedForRef = useRef<string | null>(null);
  const { data, isLoading, error } = useDentalChart(patientId);

  // Initialize/update chart engine when data loads
  useEffect(() => {
    if (!containerRef.current || !data) return;

    // Only initialize once per patient
    if (initializedForRef.current === patientId && engineRef.current) return;

    // Clean up previous engine
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }

    const chartData = convertDbToChart(data.teeth);

    const engine = new DentalChartEngine(containerRef.current, {
      onSurfaceChange: async (fdiNum, surface, condition) => {
        try {
          const universalNum = FDI_TO_UNIVERSAL[String(fdiNum)];
          if (!universalNum) return;
          const dbCondition = CHART_TO_DB[condition] || 'HEALTHY';
          const dbSurface = SURFACE_TO_DB[surface] || surface[0].toUpperCase();
          await updateToothSurfaces(patientId, universalNum, [{
            surface: dbSurface as any,
            condition: dbCondition,
          }]);
        } catch (err) {
          console.error('Failed to save surface:', err);
        }
      },
      onWholeToothChange: async (fdiNum, condition) => {
        try {
          const universalNum = FDI_TO_UNIVERSAL[String(fdiNum)];
          if (!universalNum) return;
          const dbCondition = condition ? (CHART_TO_DB[condition] || 'HEALTHY') : 'HEALTHY';
          await updateTooth(patientId, universalNum, { currentCondition: dbCondition });
        } catch (err) {
          console.error('Failed to save tooth condition:', err);
        }
      },
      onMobilityChange: async (fdiNum, mobility) => {
        try {
          const universalNum = FDI_TO_UNIVERSAL[String(fdiNum)];
          if (!universalNum) return;
          // Get current tooth data to preserve condition
          const tooth = data.teeth.find(t => t.toothNumber === universalNum);
          await updateTooth(patientId, universalNum, {
            currentCondition: tooth?.currentCondition || 'HEALTHY',
            mobility,
          });
        } catch (err) {
          console.error('Failed to save mobility:', err);
        }
      },
      onNoteChange: async (fdiNum, note) => {
        try {
          const universalNum = FDI_TO_UNIVERSAL[String(fdiNum)];
          if (!universalNum) return;
          const tooth = data.teeth.find(t => t.toothNumber === universalNum);
          await updateTooth(patientId, universalNum, {
            currentCondition: tooth?.currentCondition || 'HEALTHY',
            notes: note,
          });
        } catch (err) {
          console.error('Failed to save note:', err);
        }
      },
      onResetTooth: async (fdiNum) => {
        try {
          const universalNum = FDI_TO_UNIVERSAL[String(fdiNum)];
          if (!universalNum) return;
          await updateTooth(patientId, universalNum, {
            currentCondition: 'HEALTHY',
            mobility: 0,
            notes: '',
          });
          // Reset all surfaces to healthy
          const surfaces = ['M', 'O', 'D', 'B', 'L'] as const;
          await updateToothSurfaces(patientId, universalNum,
            surfaces.map(s => ({ surface: s, condition: 'HEALTHY' as any }))
          );
        } catch (err) {
          console.error('Failed to reset tooth:', err);
        }
      },
    });

    engine.loadTeethData(chartData);
    engineRef.current = engine;
    initializedForRef.current = patientId;

    return () => {
      engine.destroy();
      engineRef.current = null;
      initializedForRef.current = null;
    };
  }, [data, patientId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, []);

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

  return (
    <div className="space-y-6">
      <div ref={containerRef} className="dc-root" />
      {data.summary && <DentalOverview summary={data.summary} />}
    </div>
  );
}
