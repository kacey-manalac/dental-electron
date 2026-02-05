import { ToothCondition, NotationType } from '../types';

export const CONDITION_COLORS: Record<ToothCondition, string> = {
  HEALTHY: '#ffffff',
  CAVITY: '#ef4444',
  FILLED: '#3b82f6',
  CROWN: '#f59e0b',
  MISSING: '#9ca3af',
  IMPLANT: '#8b5cf6',
  ROOT_CANAL: '#f97316',
};

export const CONDITION_LABELS: Record<ToothCondition, string> = {
  HEALTHY: 'Healthy',
  CAVITY: 'Cavity',
  FILLED: 'Filled',
  CROWN: 'Crown',
  MISSING: 'Missing',
  IMPLANT: 'Implant',
  ROOT_CANAL: 'Root Canal',
};

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
