import { ToothCondition, ToothSurface, ToothSurfaceData } from '../../types';

interface ToothSVGProps {
  toothNumber: number;
  condition: ToothCondition;
  surfaces?: ToothSurfaceData[];
  isSelected?: boolean;
  onClick?: () => void;
  onSurfaceClick?: (surface: ToothSurface) => void;
  showSurfaces?: boolean;
}

const CONDITION_COLORS: Record<ToothCondition, string> = {
  HEALTHY: '#ffffff',
  CAVITY: '#ef4444',
  FILLED: '#3b82f6',
  CROWN: '#f59e0b',
  MISSING: '#9ca3af',
  IMPLANT: '#8b5cf6',
  ROOT_CANAL: '#f97316',
};

const SURFACE_COLORS: Record<ToothCondition, string> = {
  HEALTHY: '#e5e7eb',
  CAVITY: '#fca5a5',
  FILLED: '#93c5fd',
  CROWN: '#fcd34d',
  MISSING: '#d1d5db',
  IMPLANT: '#c4b5fd',
  ROOT_CANAL: '#fdba74',
};

export default function ToothSVG({
  toothNumber,
  condition,
  surfaces = [],
  isSelected,
  onClick,
  onSurfaceClick,
  showSurfaces,
}: ToothSVGProps) {
  const getSurfaceCondition = (surface: ToothSurface): ToothCondition => {
    const surfaceData = surfaces.find((s) => s.surface === surface);
    return surfaceData?.condition || 'HEALTHY';
  };

  const baseColor = CONDITION_COLORS[condition];
  const isMissing = condition === 'MISSING';

  // Determine if this is an upper or lower tooth
  const isUpper = toothNumber <= 16;

  // Determine tooth type for shape variation
  const getToothType = (num: number): 'molar' | 'premolar' | 'canine' | 'incisor' => {
    const normalizedNum = num <= 16 ? num : num - 16;
    if (normalizedNum <= 3 || normalizedNum >= 14) return 'molar';
    if (normalizedNum <= 5 || normalizedNum >= 12) return 'premolar';
    if (normalizedNum === 6 || normalizedNum === 11) return 'canine';
    return 'incisor';
  };

  const toothType = getToothType(toothNumber);

  if (showSurfaces) {
    // 5-surface view
    return (
      <svg
        viewBox="0 0 50 50"
        className={`w-12 h-12 cursor-pointer transition-transform ${
          isSelected ? 'scale-110' : 'hover:scale-105'
        }`}
        onClick={onClick}
      >
        {/* Outer ring - Buccal/Lingual on sides */}
        <g className="cursor-pointer">
          {/* Mesial (Left) */}
          <path
            d="M 5 15 L 15 15 L 15 35 L 5 35 Z"
            fill={SURFACE_COLORS[getSurfaceCondition('M')]}
            stroke="#374151"
            strokeWidth="1"
            className="hover:brightness-90 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              onSurfaceClick?.('M');
            }}
          />
          {/* Distal (Right) */}
          <path
            d="M 35 15 L 45 15 L 45 35 L 35 35 Z"
            fill={SURFACE_COLORS[getSurfaceCondition('D')]}
            stroke="#374151"
            strokeWidth="1"
            className="hover:brightness-90 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              onSurfaceClick?.('D');
            }}
          />
          {/* Buccal (Top for upper, bottom for lower) */}
          <path
            d={isUpper ? "M 15 5 L 35 5 L 35 15 L 15 15 Z" : "M 15 35 L 35 35 L 35 45 L 15 45 Z"}
            fill={SURFACE_COLORS[getSurfaceCondition('B')]}
            stroke="#374151"
            strokeWidth="1"
            className="hover:brightness-90 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              onSurfaceClick?.('B');
            }}
          />
          {/* Lingual (Bottom for upper, top for lower) */}
          <path
            d={isUpper ? "M 15 35 L 35 35 L 35 45 L 15 45 Z" : "M 15 5 L 35 5 L 35 15 L 15 15 Z"}
            fill={SURFACE_COLORS[getSurfaceCondition('L')]}
            stroke="#374151"
            strokeWidth="1"
            className="hover:brightness-90 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              onSurfaceClick?.('L');
            }}
          />
          {/* Occlusal (Center) */}
          <rect
            x="15"
            y="15"
            width="20"
            height="20"
            fill={SURFACE_COLORS[getSurfaceCondition('O')]}
            stroke="#374151"
            strokeWidth="1"
            className="hover:brightness-90 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              onSurfaceClick?.('O');
            }}
          />
        </g>
        {/* Selection indicator */}
        {isSelected && (
          <rect
            x="1"
            y="1"
            width="48"
            height="48"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            rx="4"
          />
        )}
      </svg>
    );
  }

  // Simple tooth view with shape variation
  return (
    <svg
      viewBox="0 0 40 60"
      className={`w-8 h-12 cursor-pointer transition-transform ${
        isSelected ? 'scale-110' : 'hover:scale-105'
      } ${isMissing ? 'opacity-40' : ''}`}
      onClick={onClick}
    >
      {/* Root */}
      <path
        d={
          toothType === 'molar'
            ? isUpper
              ? 'M 12 35 L 8 55 M 20 35 L 20 55 M 28 35 L 32 55'
              : 'M 12 25 L 8 5 M 20 25 L 20 5 M 28 25 L 32 5'
            : toothType === 'premolar'
            ? isUpper
              ? 'M 15 35 L 12 55 M 25 35 L 28 55'
              : 'M 15 25 L 12 5 M 25 25 L 28 5'
            : isUpper
            ? 'M 20 35 L 20 55'
            : 'M 20 25 L 20 5'
        }
        stroke={isMissing ? '#9ca3af' : '#a3a3a3'}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        strokeDasharray={isMissing ? '4 2' : 'none'}
      />
      {/* Crown */}
      <ellipse
        cx="20"
        cy={isUpper ? 20 : 40}
        rx={toothType === 'molar' ? 16 : toothType === 'premolar' ? 14 : toothType === 'canine' ? 10 : 12}
        ry={toothType === 'molar' ? 14 : toothType === 'premolar' ? 12 : 10}
        fill={baseColor}
        stroke={isMissing ? '#9ca3af' : '#374151'}
        strokeWidth="2"
        strokeDasharray={isMissing ? '4 2' : 'none'}
      />
      {/* Selection ring */}
      {isSelected && (
        <ellipse
          cx="20"
          cy={isUpper ? 20 : 40}
          rx={toothType === 'molar' ? 18 : toothType === 'premolar' ? 16 : toothType === 'canine' ? 12 : 14}
          ry={toothType === 'molar' ? 16 : toothType === 'premolar' ? 14 : 12}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}
