import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { getPaginationParams, createPaginatedResponse } from '../utils/helpers';

const SUPPLY_CATEGORIES = ['DISPOSABLE', 'INSTRUMENT', 'MATERIAL', 'MEDICATION', 'OFFICE', 'PPE', 'OTHER'] as const;

const createSupplySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.enum(SUPPLY_CATEGORIES).default('OTHER'),
  sku: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  unit: z.string().default('pcs'),
  currentStock: z.number().int().min(0).default(0),
  minimumStock: z.number().int().min(0).default(10),
  costPerUnit: z.number().min(0).default(0),
  supplier: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  expiryDate: z.string().transform(str => str ? new Date(str) : null).optional().nullable(),
});

const updateSupplySchema = createSupplySchema.partial();

const stockTransactionSchema = z.object({
  supplyId: z.string().uuid(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  notes: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
});

const adjustStockSchema = z.object({
  supplyId: z.string().uuid(),
  newQuantity: z.number().int().min(0, 'Quantity cannot be negative'),
  notes: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
});

export async function getSupplies(filters: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  category?: string;
  lowStockOnly?: boolean;
  isActive?: boolean;
}) {
  const { page, limit, search, sortBy, sortOrder } = getPaginationParams(filters);
  const skip = (page - 1) * limit;

  const where: any = {};

  // Default to only active supplies
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  } else {
    where.isActive = true;
  }

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.lowStockOnly) {
    where.currentStock = { lte: prisma.supply.fields.minimumStock };
    // Use raw query approach for SQLite
    where.AND = [
      {
        currentStock: {
          lte: prisma.$queryRaw`minimumStock`
        }
      }
    ];
    // Actually for Prisma, we need a different approach
    delete where.AND;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { supplier: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  let supplies = await prisma.supply.findMany({
    where,
    skip,
    take: limit,
    orderBy: { [sortBy]: sortOrder },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  });

  // Filter low stock in memory if requested (Prisma doesn't support comparing columns directly)
  if (filters.lowStockOnly) {
    supplies = supplies.filter(s => s.currentStock <= s.minimumStock);
  }

  const total = filters.lowStockOnly
    ? supplies.length
    : await prisma.supply.count({ where });

  return createPaginatedResponse(supplies, total, page, limit);
}

export async function getSupply(id: string) {
  const supply = await prisma.supply.findUnique({
    where: { id },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      _count: {
        select: { transactions: true },
      },
    },
  });

  if (!supply) {
    throw new Error('Supply not found');
  }

  return supply;
}

export async function createSupply(data: unknown) {
  const parsed = createSupplySchema.parse(data);

  const supply = await prisma.supply.create({
    data: {
      name: parsed.name,
      category: parsed.category,
      sku: parsed.sku,
      description: parsed.description,
      unit: parsed.unit,
      currentStock: parsed.currentStock,
      minimumStock: parsed.minimumStock,
      costPerUnit: parsed.costPerUnit,
      supplier: parsed.supplier,
      location: parsed.location,
      expiryDate: parsed.expiryDate,
    },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  });

  // Record initial stock as IN transaction if there's initial stock
  if (parsed.currentStock > 0) {
    await prisma.stockTransaction.create({
      data: {
        supplyId: supply.id,
        type: 'IN',
        quantity: parsed.currentStock,
        notes: 'Initial stock',
      },
    });
  }

  return supply;
}

export async function updateSupply(id: string, data: unknown) {
  const existing = await prisma.supply.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Supply not found');
  }

  const parsed = updateSupplySchema.parse(data);

  const supply = await prisma.supply.update({
    where: { id },
    data: {
      ...(parsed.name !== undefined && { name: parsed.name }),
      ...(parsed.category !== undefined && { category: parsed.category }),
      ...(parsed.sku !== undefined && { sku: parsed.sku }),
      ...(parsed.description !== undefined && { description: parsed.description }),
      ...(parsed.unit !== undefined && { unit: parsed.unit }),
      ...(parsed.minimumStock !== undefined && { minimumStock: parsed.minimumStock }),
      ...(parsed.costPerUnit !== undefined && { costPerUnit: parsed.costPerUnit }),
      ...(parsed.supplier !== undefined && { supplier: parsed.supplier }),
      ...(parsed.location !== undefined && { location: parsed.location }),
      ...(parsed.expiryDate !== undefined && { expiryDate: parsed.expiryDate }),
    },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  });

  return supply;
}

export async function deleteSupply(id: string) {
  const existing = await prisma.supply.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('Supply not found');
  }

  // Soft delete
  await prisma.supply.update({
    where: { id },
    data: { isActive: false },
  });

  return { success: true };
}

export async function recordUsage(data: unknown) {
  const parsed = stockTransactionSchema.parse(data);

  const supply = await prisma.supply.findUnique({ where: { id: parsed.supplyId } });
  if (!supply) {
    throw new Error('Supply not found');
  }

  if (supply.currentStock < parsed.quantity) {
    throw new Error(`Insufficient stock. Available: ${supply.currentStock}`);
  }

  const [transaction] = await prisma.$transaction([
    prisma.stockTransaction.create({
      data: {
        supplyId: parsed.supplyId,
        type: 'OUT',
        quantity: parsed.quantity,
        notes: parsed.notes,
        reference: parsed.reference,
      },
      include: {
        supply: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.supply.update({
      where: { id: parsed.supplyId },
      data: {
        currentStock: { decrement: parsed.quantity },
      },
    }),
  ]);

  return transaction;
}

export async function recordRestock(data: unknown) {
  const parsed = stockTransactionSchema.parse(data);

  const supply = await prisma.supply.findUnique({ where: { id: parsed.supplyId } });
  if (!supply) {
    throw new Error('Supply not found');
  }

  const [transaction] = await prisma.$transaction([
    prisma.stockTransaction.create({
      data: {
        supplyId: parsed.supplyId,
        type: 'IN',
        quantity: parsed.quantity,
        notes: parsed.notes,
        reference: parsed.reference,
      },
      include: {
        supply: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.supply.update({
      where: { id: parsed.supplyId },
      data: {
        currentStock: { increment: parsed.quantity },
      },
    }),
  ]);

  return transaction;
}

export async function adjustStock(data: unknown) {
  const parsed = adjustStockSchema.parse(data);

  const supply = await prisma.supply.findUnique({ where: { id: parsed.supplyId } });
  if (!supply) {
    throw new Error('Supply not found');
  }

  const difference = parsed.newQuantity - supply.currentStock;

  const [transaction] = await prisma.$transaction([
    prisma.stockTransaction.create({
      data: {
        supplyId: parsed.supplyId,
        type: 'ADJUSTMENT',
        quantity: difference,
        notes: parsed.notes || `Adjusted from ${supply.currentStock} to ${parsed.newQuantity}`,
        reference: parsed.reference,
      },
      include: {
        supply: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.supply.update({
      where: { id: parsed.supplyId },
      data: {
        currentStock: parsed.newQuantity,
      },
    }),
  ]);

  return transaction;
}

export async function getSupplyDashboardStats() {
  const supplies = await prisma.supply.findMany({
    where: { isActive: true },
    select: {
      id: true,
      category: true,
      currentStock: true,
      minimumStock: true,
      costPerUnit: true,
    },
  });

  const totalItems = supplies.length;
  const lowStockCount = supplies.filter(s => s.currentStock <= s.minimumStock).length;
  const totalValue = supplies.reduce((sum, s) => sum + (s.currentStock * s.costPerUnit), 0);

  // Group by category
  const categoryMap = new Map<string, number>();
  for (const supply of supplies) {
    categoryMap.set(supply.category, (categoryMap.get(supply.category) || 0) + 1);
  }

  const byCategory = Array.from(categoryMap.entries()).map(([category, count]) => ({
    category,
    count,
  }));

  return {
    totalItems,
    lowStockCount,
    totalValue,
    byCategory,
  };
}

export async function getLowStockAlerts() {
  const supplies = await prisma.supply.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      category: true,
      sku: true,
      unit: true,
      currentStock: true,
      minimumStock: true,
      supplier: true,
    },
    orderBy: { name: 'asc' },
  });

  // Filter for low stock
  return supplies.filter(s => s.currentStock <= s.minimumStock);
}
