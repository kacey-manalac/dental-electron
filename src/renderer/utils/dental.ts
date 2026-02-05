import { ToothCondition, NotationType } from '../types';

export const CONDITION_COLORS: Record<ToothCondition, string> = {
  HEALTHY: '#D4D4D8',
  CAVITY: '#EF4444',
  FILLED: '#60A5FA',
  CROWN: '#A78BFA',
  MISSING: '#52525B',
  IMPLANT: '#2DD4BF',
  ROOT_CANAL: '#FB923C',
  COMPOSITE: '#60A5FA',
  AMALGAM: '#9CA3AF',
  GOLD: '#FBBF24',
  CERAMIC: '#E2E8F0',
  SEALANT: '#34D399',
  VENEER: '#22D3EE',
  PONTIC: '#818CF8',
  FRACTURE: '#DC2626',
  IMPACTED: '#78716C',
};

export const CONDITION_LABELS: Record<ToothCondition, string> = {
  HEALTHY: 'Healthy',
  CAVITY: 'Caries',
  FILLED: 'Filled',
  CROWN: 'Crown',
  MISSING: 'Missing',
  IMPLANT: 'Implant',
  ROOT_CANAL: 'Root Canal',
  COMPOSITE: 'Composite',
  AMALGAM: 'Amalgam',
  GOLD: 'Gold Filling',
  CERAMIC: 'Ceramic',
  SEALANT: 'Sealant',
  VENEER: 'Veneer',
  PONTIC: 'Pontic',
  FRACTURE: 'Fracture',
  IMPACTED: 'Impacted',
};

// Mapping between chart engine condition keys and DB condition enums
export const CHART_TO_DB: Record<string, ToothCondition> = {
  healthy: 'HEALTHY',
  caries: 'CAVITY',
  composite: 'COMPOSITE',
  amalgam: 'AMALGAM',
  gold: 'GOLD',
  ceramic: 'CERAMIC',
  sealant: 'SEALANT',
  rct: 'ROOT_CANAL',
  crown: 'CROWN',
  veneer: 'VENEER',
  missing: 'MISSING',
  implant: 'IMPLANT',
  pontic: 'PONTIC',
  fracture: 'FRACTURE',
  impacted: 'IMPACTED',
};

export const DB_TO_CHART: Record<string, string> = Object.fromEntries(
  Object.entries(CHART_TO_DB).map(([chart, db]) => [db, chart])
);

export const SURFACE_TO_DB: Record<string, string> = {
  mesial: 'M', distal: 'D', buccal: 'B', lingual: 'L', occlusal: 'O'
};

export const DB_TO_SURFACE: Record<string, string> = {
  M: 'mesial', D: 'distal', B: 'buccal', L: 'lingual', O: 'occlusal'
};

// Conditions that are "whole tooth" conditions (not per-surface)
export const WHOLE_TOOTH_CONDITIONS: ToothCondition[] = [
  'CROWN', 'VENEER', 'MISSING', 'IMPLANT', 'PONTIC', 'FRACTURE', 'IMPACTED'
];

export const FDI_NUMBERS: Record<number, string> = {
  1: '18', 2: '17', 3: '16', 4: '15', 5: '14', 6: '13', 7: '12', 8: '11',
  9: '21', 10: '22', 11: '23', 12: '24', 13: '25', 14: '26', 15: '27', 16: '28',
  17: '38', 18: '37', 19: '36', 20: '35', 21: '34', 22: '33', 23: '32', 24: '31',
  25: '41', 26: '42', 27: '43', 28: '44', 29: '45', 30: '46', 31: '47', 32: '48',
};

export const UNIVERSAL_TO_FDI: Record<number, string> = FDI_NUMBERS;

export const FDI_TO_UNIVERSAL: Record<string, number> = Object.fromEntries(
  Object.entries(FDI_NUMBERS).map(([universal, fdi]) => [fdi, parseInt(universal)])
);

export function getDisplayNumber(universalNum: number, notation: NotationType): string {
  if (notation === 'fdi') {
    return FDI_NUMBERS[universalNum] || universalNum.toString();
  }
  return universalNum.toString();
}

export function getToothName(toothNumber: number): string {
  const names: Record<number, string> = {
    1: 'Upper Right Third Molar',
    2: 'Upper Right Second Molar',
    3: 'Upper Right First Molar',
    4: 'Upper Right Second Premolar',
    5: 'Upper Right First Premolar',
    6: 'Upper Right Canine',
    7: 'Upper Right Lateral Incisor',
    8: 'Upper Right Central Incisor',
    9: 'Upper Left Central Incisor',
    10: 'Upper Left Lateral Incisor',
    11: 'Upper Left Canine',
    12: 'Upper Left First Premolar',
    13: 'Upper Left Second Premolar',
    14: 'Upper Left First Molar',
    15: 'Upper Left Second Molar',
    16: 'Upper Left Third Molar',
    17: 'Lower Left Third Molar',
    18: 'Lower Left Second Molar',
    19: 'Lower Left First Molar',
    20: 'Lower Left Second Premolar',
    21: 'Lower Left First Premolar',
    22: 'Lower Left Canine',
    23: 'Lower Left Lateral Incisor',
    24: 'Lower Left Central Incisor',
    25: 'Lower Right Central Incisor',
    26: 'Lower Right Lateral Incisor',
    27: 'Lower Right Canine',
    28: 'Lower Right First Premolar',
    29: 'Lower Right Second Premolar',
    30: 'Lower Right First Molar',
    31: 'Lower Right Second Molar',
    32: 'Lower Right Third Molar',
  };
  return names[toothNumber] || `Tooth ${toothNumber}`;
}

export function getSurfaceName(surface: string): string {
  const names: Record<string, string> = {
    M: 'Mesial',
    O: 'Occlusal',
    D: 'Distal',
    B: 'Buccal',
    L: 'Lingual',
  };
  return names[surface] || surface;
}
