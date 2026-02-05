import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { getPaginationParams, createPaginatedResponse } from '../utils/helpers';

const treatmentSchema = z.object({
  patientId: z.string().uuid(),
  dentistId: z.string().uuid(),
  appointmentId: z.string().uuid().optional().nullable(),
  toothNumber: z.number().int().min(1).max(32).optional().nullable(),
  procedureCode: z.string().optional().nullable(),
  procedureName: z.string().min(1),
  description: z.string().optional().nullable(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  cost: z.number().min(0),
  notes: z.string().optional().nullable(),
  performedAt: z.string().transform(str => str ? new Date(str) : null).optional().nullable(),
});

export async function getTreatments(filters: {
  page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string;
  patientId?: string; dentistId?: string; status?: string;
}) {
  const { page, limit, search, sortBy, sortOrder } = getPaginationParams(filters);
  const skip = (page - 1) * limit;

  const where: any = {};

  if (filters.patientId) where.patientId = filters.patientId;
  if (filters.dentistId) where.dentistId = filters.dentistId;
  if (filters.status) where.status = filters.status;

  if (search) {
    where.OR = [
      { procedureName: { contains: search } },
      { procedureCode: { contains: search } },
      { patient: { firstName: { contains: search } } },
      { patient: { lastName: { contains: search } } },
    ];
  }

  const [treatments, total] = await Promise.all([
    prisma.treatment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true },
        },
        dentist: {
          select: { id: true, firstName: true, lastName: true },
        },
        appointment: {
          select: { id: true, title: true, startTime: true },
        },
      },
    }),
    prisma.treatment.count({ where }),
  ]);

  return createPaginatedResponse(treatments, total, page, limit);
}

export async function getTreatment(id: string) {
  const treatment = await prisma.treatment.findUnique({
    where: { id },
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true, phone: true },
      },
      dentist: {
        select: { id: true, firstName: true, lastName: true },
      },
      appointment: {
        select: { id: true, title: true, startTime: true, endTime: true },
      },
      invoiceItems: {
        include: {
          invoice: {
            select: { id: true, invoiceNumber: true, status: true },
          },
        },
      },
    },
  });

  if (!treatment) {
    throw new Error('Treatment not found');
  }

  return treatment;
}

export async function createTreatment(data: unknown) {
  const parsed = treatmentSchema.parse(data);

  const treatment = await prisma.treatment.create({
    data: {
      ...parsed,
      cost: parsed.cost,
    },
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true },
      },
      dentist: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  return treatment;
}

export async function updateTreatment(id: string, data: unknown) {
  const parsed = treatmentSchema.partial().parse(data);

  const existing = await prisma.treatment.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Treatment not found');
  }

  const treatment = await prisma.treatment.update({
    where: { id },
    data: {
      ...parsed,
      cost: parsed.cost,
    },
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true },
      },
      dentist: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  return treatment;
}

export async function deleteTreatment(id: string) {
  const treatment = await prisma.treatment.findUnique({ where: { id } });
  if (!treatment) {
    throw new Error('Treatment not found');
  }

  const invoiceItem = await prisma.invoiceItem.findFirst({
    where: { treatmentId: id },
  });

  if (invoiceItem) {
    throw new Error('Cannot delete treatment linked to an invoice');
  }

  await prisma.treatment.delete({ where: { id } });

  return null;
}
