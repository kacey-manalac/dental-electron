import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { getPaginationParams, createPaginatedResponse } from '../utils/helpers';
import { format } from 'date-fns';

const appointmentSchema = z.object({
  patientId: z.string().uuid(),
  dentistId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  startTime: z.string().transform(str => new Date(str)),
  endTime: z.string().transform(str => new Date(str)),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  notes: z.string().optional().nullable(),
  clinicalNotes: z.string().optional().nullable(),
  isRecurring: z.boolean().optional(),
  recurrencePattern: z.string().optional().nullable(),
  recurrenceInterval: z.number().int().optional().nullable(),
  recurrenceEndDate: z.string().transform(str => new Date(str)).optional().nullable(),
  seriesId: z.string().optional().nullable(),
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
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
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

function formatConflictMessage(overlapping: any): string {
  const start = format(new Date(overlapping.startTime), 'h:mm a');
  const end = format(new Date(overlapping.endTime), 'h:mm a');
  const patientName = overlapping.patient
    ? `${overlapping.patient.firstName} ${overlapping.patient.lastName}`
    : 'Unknown';
  return `Time conflict with "${overlapping.title}" (${patientName}, ${start} - ${end})`;
}

export async function createAppointment(data: unknown) {
  const parsed = appointmentSchema.parse(data);

  // If recurring, generate series
  if (parsed.isRecurring && parsed.recurrencePattern && parsed.recurrenceEndDate) {
    return generateRecurringInstances(parsed);
  }

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
    include: {
      patient: { select: { firstName: true, lastName: true } },
    },
  });

  if (overlapping) {
    throw new Error(formatConflictMessage(overlapping));
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

  // If appointment is COMPLETED, update matching recalls
  if (parsed.status === 'COMPLETED') {
    await updateRecallsOnCompletion(parsed.patientId);
  }

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
      include: {
        patient: { select: { firstName: true, lastName: true } },
      },
    });

    if (overlapping) {
      throw new Error(formatConflictMessage(overlapping));
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

  // If status changed to COMPLETED, update recalls
  if (parsed.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
    await updateRecallsOnCompletion(existing.patientId);
  }

  return appointment;
}

export async function deleteAppointment(id: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) {
    throw new Error('Appointment not found');
  }

  await prisma.appointment.delete({
    where: { id },
  });

  return null;
}

export async function deleteAppointmentSeries(seriesId: string) {
  const count = await prisma.appointment.count({ where: { seriesId } });
  if (count === 0) {
    throw new Error('No appointments found in this series');
  }

  await prisma.appointment.deleteMany({
    where: { seriesId, status: { in: ['SCHEDULED', 'CONFIRMED'] } },
  });

  return { deleted: count };
}

async function generateRecurringInstances(parsed: any) {
  const seriesId = crypto.randomUUID();
  const duration = parsed.endTime.getTime() - parsed.startTime.getTime();
  const appointments: any[] = [];

  let currentStart = new Date(parsed.startTime);
  const endDate = new Date(parsed.recurrenceEndDate);

  while (currentStart <= endDate) {
    const currentEnd = new Date(currentStart.getTime() + duration);

    appointments.push({
      patientId: parsed.patientId,
      dentistId: parsed.dentistId,
      title: parsed.title,
      description: parsed.description,
      startTime: new Date(currentStart),
      endTime: currentEnd,
      status: parsed.status || 'SCHEDULED',
      notes: parsed.notes,
      clinicalNotes: parsed.clinicalNotes,
      isRecurring: true,
      recurrencePattern: parsed.recurrencePattern,
      recurrenceInterval: parsed.recurrenceInterval,
      recurrenceEndDate: parsed.recurrenceEndDate,
      seriesId,
    });

    // Advance based on pattern
    switch (parsed.recurrencePattern) {
      case 'WEEKLY':
        currentStart = new Date(currentStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'BIWEEKLY':
        currentStart = new Date(currentStart.getTime() + 14 * 24 * 60 * 60 * 1000);
        break;
      case 'MONTHLY':
        currentStart = new Date(currentStart);
        currentStart.setMonth(currentStart.getMonth() + 1);
        break;
      default:
        currentStart = new Date(currentStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  // Create all in a transaction, skip conflict checking for batch
  const created = await prisma.$transaction(
    appointments.map(appt => prisma.appointment.create({ data: appt }))
  );

  // Return the first one with includes
  const first = await prisma.appointment.findUnique({
    where: { id: created[0].id },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      dentist: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return first;
}

async function updateRecallsOnCompletion(patientId: string) {
  const recalls = await prisma.recallSchedule.findMany({
    where: { patientId, isActive: true, status: { not: 'COMPLETED' } },
  });

  const now = new Date();
  for (const recall of recalls) {
    const nextDueDate = new Date(now);
    nextDueDate.setMonth(nextDueDate.getMonth() + recall.intervalMonths);

    await prisma.recallSchedule.update({
      where: { id: recall.id },
      data: {
        lastVisitDate: now,
        nextDueDate,
        status: 'UPCOMING',
      },
    });
  }
}
