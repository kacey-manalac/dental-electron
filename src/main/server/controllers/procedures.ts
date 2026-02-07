import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { getPaginationParams, createPaginatedResponse } from '../utils/helpers';

const PROCEDURE_CATEGORIES = [
  'PREVENTIVE', 'RESTORATIVE', 'ENDODONTIC', 'PROSTHODONTIC',
  'ORTHODONTIC', 'SURGICAL', 'DIAGNOSTIC', 'COSMETIC', 'OTHER',
] as const;

const procedureSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  defaultCost: z.number().min(0),
  category: z.enum(PROCEDURE_CATEGORIES).default('OTHER'),
  estimatedDuration: z.number().int().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function getProcedures(filters: {
  page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string;
  category?: string; isActive?: boolean;
}) {
  const { page, limit, search, sortBy, sortOrder } = getPaginationParams(filters);
  const skip = (page - 1) * limit;

  const where: any = {};

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  } else {
    where.isActive = true;
  }

  if (filters.category) {
    where.category = filters.category;
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const [procedures, total] = await Promise.all([
    prisma.procedureCatalog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: { select: { procedureSupplies: true } },
      },
    }),
    prisma.procedureCatalog.count({ where }),
  ]);

  return createPaginatedResponse(procedures, total, page, limit);
}

export async function getProcedure(id: string) {
  const procedure = await prisma.procedureCatalog.findUnique({
    where: { id },
    include: {
      procedureSupplies: {
        include: {
          supply: {
            select: { id: true, name: true, unit: true, currentStock: true },
          },
        },
      },
    },
  });

  if (!procedure) {
    throw new Error('Procedure not found');
  }

  return procedure;
}

export async function createProcedure(data: unknown) {
  const parsed = procedureSchema.parse(data);

  return prisma.procedureCatalog.create({
    data: parsed,
  });
}

export async function updateProcedure(id: string, data: unknown) {
  const parsed = procedureSchema.partial().parse(data);

  const existing = await prisma.procedureCatalog.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Procedure not found');
  }

  return prisma.procedureCatalog.update({
    where: { id },
    data: parsed,
  });
}

export async function deleteProcedure(id: string) {
  const existing = await prisma.procedureCatalog.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Procedure not found');
  }

  await prisma.procedureCatalog.update({
    where: { id },
    data: { isActive: false },
  });

  return { success: true };
}

export async function getActiveProcedures() {
  return prisma.procedureCatalog.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      code: true,
      defaultCost: true,
      category: true,
      estimatedDuration: true,
    },
  });
}

// Procedure-Supply linking (Feature 10)
export async function getProcedureSupplies(procedureCatalogId: string) {
  return prisma.procedureSupply.findMany({
    where: { procedureCatalogId },
    include: {
      supply: {
        select: { id: true, name: true, unit: true, currentStock: true, costPerUnit: true },
      },
    },
  });
}

export async function addProcedureSupply(data: { procedureCatalogId: string; supplyId: string; quantityUsed: number }) {
  return prisma.procedureSupply.create({
    data: {
      procedureCatalogId: data.procedureCatalogId,
      supplyId: data.supplyId,
      quantityUsed: data.quantityUsed || 1,
    },
    include: {
      supply: {
        select: { id: true, name: true, unit: true, currentStock: true },
      },
    },
  });
}

export async function removeProcedureSupply(id: string) {
  await prisma.procedureSupply.delete({ where: { id } });
  return { success: true };
}
