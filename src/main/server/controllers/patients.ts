import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { getPaginationParams, createPaginatedResponse } from '../utils/helpers';

const patientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(1),
  dateOfBirth: z.string().transform(str => new Date(str)),
  gender: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  emergencyPhone: z.string().optional().nullable(),
  insuranceProvider: z.string().optional().nullable(),
  insuranceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const medicalHistorySchema = z.object({
  allergies: z.string().optional().nullable(),
  medications: z.string().optional().nullable(),
  medicalConditions: z.string().optional().nullable(),
  previousSurgeries: z.string().optional().nullable(),
  smokingStatus: z.string().optional().nullable(),
  alcoholConsumption: z.string().optional().nullable(),
  bloodType: z.string().optional().nullable(),
  lastDentalVisit: z.string().transform(str => str ? new Date(str) : null).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function getPatients(filters: { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string }) {
  const { page, limit, search, sortBy, sortOrder } = getPaginationParams(filters);
  const skip = (page - 1) * limit;

  const where = search
    ? {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
        ],
        isActive: true,
      }
    : { isActive: true };

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: {
          select: {
            appointments: {
              where: {
                startTime: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
              },
            },
            treatments: true,
          },
        },
      },
    }),
    prisma.patient.count({ where }),
  ]);

  return createPaginatedResponse(patients, total, page, limit);
}

export async function getPatient(id: string) {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      medicalHistory: true,
      teeth: {
        include: {
          surfaces: true,
          conditions: {
            orderBy: { recordedAt: 'desc' },
            take: 5,
          },
        },
      },
      appointments: {
        orderBy: { startTime: 'desc' },
        take: 10,
        include: {
          dentist: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      treatments: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          dentist: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      invoices: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });

  if (!patient) {
    throw new Error('Patient not found');
  }

  return patient;
}

export async function createPatient(data: unknown) {
  const parsed = patientSchema.parse(data);

  const patient = await prisma.patient.create({
    data: {
      ...parsed,
      medicalHistory: {
        create: {},
      },
    },
    include: {
      medicalHistory: true,
    },
  });

  // Create default teeth records (adult dentition)
  const teethData = [];
  for (let i = 1; i <= 32; i++) {
    teethData.push({
      patientId: patient.id,
      toothNumber: i,
      isAdult: true,
    });
  }
  await prisma.tooth.createMany({ data: teethData });

  await prisma.auditLog.create({
    data: {
      userId: null,
      action: 'CREATE',
      entityType: 'patient',
      entityId: patient.id,
      newValues: parsed as any,
    },
  });

  return patient;
}

export async function updatePatient(id: string, data: unknown) {
  const parsed = patientSchema.partial().parse(data);

  const existing = await prisma.patient.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Patient not found');
  }

  const patient = await prisma.patient.update({
    where: { id },
    data: parsed,
    include: {
      medicalHistory: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: null,
      action: 'UPDATE',
      entityType: 'patient',
      entityId: patient.id,
      oldValues: existing as any,
      newValues: parsed as any,
    },
  });

  return patient;
}

export async function deletePatient(id: string) {
  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) {
    throw new Error('Patient not found');
  }

  await prisma.patient.update({
    where: { id },
    data: { isActive: false },
  });

  await prisma.auditLog.create({
    data: {
      userId: null,
      action: 'DELETE',
      entityType: 'patient',
      entityId: id,
    },
  });

  return null;
}

export async function updateMedicalHistory(id: string, data: unknown) {
  const parsed = medicalHistorySchema.parse(data);

  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) {
    throw new Error('Patient not found');
  }

  const medicalHistory = await prisma.medicalHistory.upsert({
    where: { patientId: id },
    update: parsed,
    create: {
      patientId: id,
      ...parsed,
    },
  });

  return medicalHistory;
}
