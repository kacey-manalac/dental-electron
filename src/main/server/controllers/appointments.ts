import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { getPaginationParams, createPaginatedResponse } from '../utils/helpers';

const appointmentSchema = z.object({
  patientId: z.string().uuid(),
  dentistId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  startTime: z.string().transform(str => new Date(str)),
  endTime: z.string().transform(str => new Date(str)),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  notes: z.string().optional().nullable(),
});

export async function getAppointments(filters: {
  page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string;
  patientId?: string; dentistId?: string; status?: string; startDate?: string; endDate?: string;
}) {
  const { page, limit, search, sortBy, sortOrder } = getPaginationParams(filters);
  const skip = (page - 1) * limit;

  const where: any = {};

  if (filters.patientId) where.patientId = filters.patientId;
  if (filters.dentistId) where.dentistId = filters.dentistId;
  if (filters.status) where.status = filters.status;

  if (filters.startDate || filters.endDate) {
    where.startTime = {};
    if (filters.startDate) where.startTime.gte = new Date(filters.startDate);
    if (filters.endDate) where.startTime.lte = new Date(filters.endDate);
  }

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { patient: { firstName: { contains: search } } },
      { patient: { lastName: { contains: search } } },
    ];
  }

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy === 'createdAt' ? 'startTime' : sortBy]: sortOrder },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        dentist: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    }),
    prisma.appointment.count({ where }),
  ]);

  return createPaginatedResponse(appointments, total, page, limit);
}

export async function getAppointment(id: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true, phone: true, email: true },
      },
      dentist: {
        select: { id: true, firstName: true, lastName: true },
      },
      treatments: true,
    },
  });

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  return appointment;
}

export async function createAppointment(data: unknown) {
  const parsed = appointmentSchema.parse(data);

  const overlapping = await prisma.appointment.findFirst({
    where: {
      dentistId: parsed.dentistId,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      OR: [
        { startTime: { lte: parsed.startTime }, endTime: { gt: parsed.startTime } },
        { startTime: { lt: parsed.endTime }, endTime: { gte: parsed.endTime } },
        { startTime: { gte: parsed.startTime }, endTime: { lte: parsed.endTime } },
      ],
    },
  });

  if (overlapping) {
    throw new Error('This time slot overlaps with an existing appointment');
  }

  const appointment = await prisma.appointment.create({
    data: parsed,
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true },
      },
      dentist: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  return appointment;
}

export async function updateAppointment(id: string, data: unknown) {
  const parsed = appointmentSchema.partial().parse(data);

  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Appointment not found');
  }

  if (parsed.startTime || parsed.endTime) {
    const startTime = parsed.startTime || existing.startTime;
    const endTime = parsed.endTime || existing.endTime;
    const dentistId = parsed.dentistId || existing.dentistId;

    const overlapping = await prisma.appointment.findFirst({
      where: {
        id: { not: id },
        dentistId,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        OR: [
          { startTime: { lte: startTime }, endTime: { gt: startTime } },
          { startTime: { lt: endTime }, endTime: { gte: endTime } },
          { startTime: { gte: startTime }, endTime: { lte: endTime } },
        ],
      },
    });

    if (overlapping) {
      throw new Error('This time slot overlaps with an existing appointment');
    }
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: parsed,
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true },
      },
      dentist: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  return appointment;
}

export async function deleteAppointment(id: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) {
    throw new Error('Appointment not found');
  }

  await prisma.appointment.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  return null;
}
