import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { getPaginationParams, createPaginatedResponse } from '../utils/helpers';

const RECALL_TYPES = ['CLEANING', 'CHECKUP', 'FOLLOWUP', 'XRAY', 'OTHER'] as const;
const RECALL_STATUSES = ['UPCOMING', 'DUE', 'OVERDUE', 'COMPLETED'] as const;

const recallSchema = z.object({
  patientId: z.string().uuid(),
  recallType: z.enum(RECALL_TYPES),
  intervalMonths: z.number().int().min(1).max(60),
  lastVisitDate: z.string().transform(str => str ? new Date(str) : null).optional().nullable(),
  nextDueDate: z.string().transform(str => new Date(str)).optional(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function getRecalls(filters: {
  page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string;
  patientId?: string; status?: string; recallType?: string;
}) {
  const { page, limit, sortOrder } = getPaginationParams(filters);
  const skip = (page - 1) * limit;

  const where: any = { isActive: true };

  if (filters.patientId) where.patientId = filters.patientId;
  if (filters.status) where.status = filters.status;
  if (filters.recallType) where.recallType = filters.recallType;

  const [recalls, total] = await Promise.all([
    prisma.recallSchedule.findMany({
      where,
      skip,
      take: limit,
      orderBy: { nextDueDate: sortOrder },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
      },
    }),
    prisma.recallSchedule.count({ where }),
  ]);

  return createPaginatedResponse(recalls, total, page, limit);
}

export async function createRecall(data: unknown) {
  const parsed = recallSchema.parse(data);

  // Auto-compute nextDueDate if not provided
  let nextDueDate: Date;
  if (parsed.nextDueDate) {
    nextDueDate = parsed.nextDueDate;
  } else if (parsed.lastVisitDate) {
    nextDueDate = new Date(parsed.lastVisitDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + parsed.intervalMonths);
  } else {
    nextDueDate = new Date();
    nextDueDate.setMonth(nextDueDate.getMonth() + parsed.intervalMonths);
  }

  // Determine status based on nextDueDate
  const now = new Date();
  type RS = 'UPCOMING' | 'DUE' | 'OVERDUE' | 'COMPLETED';
  let status: RS = 'UPCOMING';
  const daysUntilDue = (nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntilDue < 0) {
    status = 'OVERDUE';
  } else if (daysUntilDue <= 30) {
    status = 'DUE';
  }

  return prisma.recallSchedule.create({
    data: {
      patientId: parsed.patientId,
      recallType: parsed.recallType,
      intervalMonths: parsed.intervalMonths,
      lastVisitDate: parsed.lastVisitDate,
      nextDueDate,
      status,
      notes: parsed.notes,
    },
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
}

export async function updateRecall(id: string, data: unknown) {
  const parsed = recallSchema.partial().parse(data);

  const existing = await prisma.recallSchedule.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Recall not found');
  }

  const updateData: any = { ...parsed };

  // Recompute nextDueDate if interval or lastVisitDate changed
  if (parsed.intervalMonths || parsed.lastVisitDate !== undefined) {
    const interval = parsed.intervalMonths || existing.intervalMonths;
    const lastVisit = parsed.lastVisitDate || existing.lastVisitDate;

    if (lastVisit) {
      const nextDue = new Date(lastVisit);
      nextDue.setMonth(nextDue.getMonth() + interval);
      updateData.nextDueDate = nextDue;

      const now = new Date();
      const daysUntilDue = (nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (daysUntilDue < 0) updateData.status = 'OVERDUE';
      else if (daysUntilDue <= 30) updateData.status = 'DUE';
      else updateData.status = 'UPCOMING';
    }
  }

  return prisma.recallSchedule.update({
    where: { id },
    data: updateData,
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
}

export async function deleteRecall(id: string) {
  const existing = await prisma.recallSchedule.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Recall not found');
  }

  await prisma.recallSchedule.update({
    where: { id },
    data: { isActive: false },
  });

  return { success: true };
}

export async function getDueRecalls() {
  // Update statuses first
  await updateRecallStatuses();

  return prisma.recallSchedule.findMany({
    where: {
      isActive: true,
      status: { in: ['DUE', 'OVERDUE'] },
    },
    orderBy: { nextDueDate: 'asc' },
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true, phone: true, email: true },
      },
    },
  });
}

async function updateRecallStatuses() {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  // Mark overdue
  await prisma.recallSchedule.updateMany({
    where: {
      isActive: true,
      status: { not: 'COMPLETED' },
      nextDueDate: { lt: now },
    },
    data: { status: 'OVERDUE' },
  });

  // Mark due (within 30 days)
  await prisma.recallSchedule.updateMany({
    where: {
      isActive: true,
      status: { not: 'COMPLETED' },
      nextDueDate: { gte: now, lte: thirtyDaysFromNow },
    },
    data: { status: 'DUE' },
  });

  // Mark upcoming (beyond 30 days)
  await prisma.recallSchedule.updateMany({
    where: {
      isActive: true,
      status: { not: 'COMPLETED' },
      nextDueDate: { gt: thirtyDaysFromNow },
    },
    data: { status: 'UPCOMING' },
  });
}
