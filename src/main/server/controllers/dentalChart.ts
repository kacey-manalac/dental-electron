import { z } from 'zod';
import { ToothCondition } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { UNIVERSAL_TO_FDI } from '../types';

const TOOTH_CONDITIONS = ['HEALTHY', 'CAVITY', 'FILLED', 'CROWN', 'MISSING', 'IMPLANT', 'ROOT_CANAL', 'COMPOSITE', 'AMALGAM', 'GOLD', 'CERAMIC', 'SEALANT', 'VENEER', 'PONTIC', 'FRACTURE', 'IMPACTED'] as const;

const updateToothSchema = z.object({
  currentCondition: z.enum(TOOTH_CONDITIONS),
  mobility: z.number().int().min(0).max(3).optional(),
  notes: z.string().optional().nullable(),
});

const addConditionSchema = z.object({
  condition: z.enum(TOOTH_CONDITIONS),
  notes: z.string().optional().nullable(),
});

const updateSurfacesSchema = z.object({
  surfaces: z.array(z.object({
    surface: z.enum(['M', 'O', 'D', 'B', 'L']),
    condition: z.enum(TOOTH_CONDITIONS),
    notes: z.string().optional().nullable(),
  })),
});

export async function getDentalChart(patientId: string) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true, firstName: true, lastName: true },
  });

  if (!patient) {
    throw new Error('Patient not found');
  }

  let teeth = await prisma.tooth.findMany({
    where: { patientId },
    include: {
      surfaces: true,
      conditions: {
        orderBy: { recordedAt: 'desc' },
        take: 10,
      },
    },
    orderBy: { toothNumber: 'asc' },
  });

  if (teeth.length === 0) {
    const teethData = [];
    for (let i = 1; i <= 32; i++) {
      teethData.push({
        patientId,
        toothNumber: i,
        fdiNumber: UNIVERSAL_TO_FDI[i],
        isAdult: true,
      });
    }
    await prisma.tooth.createMany({ data: teethData });

    teeth = await prisma.tooth.findMany({
      where: { patientId },
      include: {
        surfaces: true,
        conditions: true,
      },
      orderBy: { toothNumber: 'asc' },
    });

    return { patient, teeth };
  }

  const summary = {
    total: teeth.length,
    healthy: teeth.filter(t => t.currentCondition === 'HEALTHY').length,
    cavities: teeth.filter(t => t.currentCondition === 'CAVITY').length,
    filled: teeth.filter(t => t.currentCondition === 'FILLED').length,
    crowns: teeth.filter(t => t.currentCondition === 'CROWN').length,
    missing: teeth.filter(t => t.currentCondition === 'MISSING').length,
    implants: teeth.filter(t => t.currentCondition === 'IMPLANT').length,
    rootCanals: teeth.filter(t => t.currentCondition === 'ROOT_CANAL').length,
    composites: teeth.filter(t => t.currentCondition === 'COMPOSITE').length,
    amalgams: teeth.filter(t => t.currentCondition === 'AMALGAM').length,
    golds: teeth.filter(t => t.currentCondition === 'GOLD').length,
    ceramics: teeth.filter(t => t.currentCondition === 'CERAMIC').length,
    sealants: teeth.filter(t => t.currentCondition === 'SEALANT').length,
    veneers: teeth.filter(t => t.currentCondition === 'VENEER').length,
    pontics: teeth.filter(t => t.currentCondition === 'PONTIC').length,
    fractures: teeth.filter(t => t.currentCondition === 'FRACTURE').length,
    impacted: teeth.filter(t => t.currentCondition === 'IMPACTED').length,
  };

  return { patient, teeth, summary };
}

export async function updateTooth(patientId: string, toothNumber: number, data: unknown) {
  const parsed = updateToothSchema.parse(data);

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    throw new Error('Patient not found');
  }

  let tooth = await prisma.tooth.findUnique({
    where: {
      patientId_toothNumber: {
        patientId,
        toothNumber,
      },
    },
  });

  if (!tooth) {
    tooth = await prisma.tooth.create({
      data: {
        patientId,
        toothNumber,
        fdiNumber: UNIVERSAL_TO_FDI[toothNumber],
        isAdult: true,
        currentCondition: parsed.currentCondition as ToothCondition,
        mobility: parsed.mobility ?? 0,
        notes: parsed.notes,
      },
    });
  } else {
    tooth = await prisma.tooth.update({
      where: { id: tooth.id },
      data: {
        currentCondition: parsed.currentCondition as ToothCondition,
        ...(parsed.mobility !== undefined ? { mobility: parsed.mobility } : {}),
        notes: parsed.notes,
      },
    });
  }

  await prisma.toothConditionHistory.create({
    data: {
      toothId: tooth.id,
      condition: parsed.currentCondition as ToothCondition,
      notes: parsed.notes,
      recordedBy: 'local',
    },
  });

  const updatedTooth = await prisma.tooth.findUnique({
    where: { id: tooth.id },
    include: {
      surfaces: true,
      conditions: {
        orderBy: { recordedAt: 'desc' },
        take: 10,
      },
    },
  });

  return updatedTooth;
}

export async function addToothCondition(patientId: string, toothNumber: number, data: unknown) {
  const parsed = addConditionSchema.parse(data);

  const tooth = await prisma.tooth.findUnique({
    where: {
      patientId_toothNumber: {
        patientId,
        toothNumber,
      },
    },
  });

  if (!tooth) {
    throw new Error('Tooth not found');
  }

  await prisma.tooth.update({
    where: { id: tooth.id },
    data: {
      currentCondition: parsed.condition as ToothCondition,
    },
  });

  const conditionHistory = await prisma.toothConditionHistory.create({
    data: {
      toothId: tooth.id,
      condition: parsed.condition as ToothCondition,
      notes: parsed.notes,
      recordedBy: 'local',
    },
  });

  return conditionHistory;
}

export async function updateToothSurfaces(patientId: string, toothNumber: number, data: unknown) {
  const { surfaces } = updateSurfacesSchema.parse(data);

  const tooth = await prisma.tooth.findUnique({
    where: {
      patientId_toothNumber: {
        patientId,
        toothNumber,
      },
    },
  });

  if (!tooth) {
    throw new Error('Tooth not found');
  }

  for (const surface of surfaces) {
    await prisma.toothSurface.upsert({
      where: {
        toothId_surface: {
          toothId: tooth.id,
          surface: surface.surface,
        },
      },
      update: {
        condition: surface.condition as ToothCondition,
        notes: surface.notes,
      },
      create: {
        toothId: tooth.id,
        surface: surface.surface,
        condition: surface.condition as ToothCondition,
        notes: surface.notes,
      },
    });
  }

  const updatedTooth = await prisma.tooth.findUnique({
    where: { id: tooth.id },
    include: {
      surfaces: true,
      conditions: {
        orderBy: { recordedAt: 'desc' },
        take: 10,
      },
    },
  });

  return updatedTooth;
}
