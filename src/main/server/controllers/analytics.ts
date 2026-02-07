import { prisma } from '../utils/prisma';

export async function getDashboardStats() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

  const [
    totalPatients,
    newPatientsThisMonth,
    newPatientsLastMonth,
    totalAppointments,
    appointmentsThisMonth,
    upcomingAppointments,
    completedTreatmentsThisMonth,
    revenueThisMonth,
    revenueLastMonth,
    pendingInvoices,
  ] = await Promise.all([
    prisma.patient.count({ where: { isActive: true } }),
    prisma.patient.count({
      where: { createdAt: { gte: startOfMonth }, isActive: true },
    }),
    prisma.patient.count({
      where: {
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        isActive: true,
      },
    }),
    prisma.appointment.count(),
    prisma.appointment.count({
      where: { startTime: { gte: startOfMonth } },
    }),
    prisma.appointment.count({
      where: {
        startTime: { gte: today },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
    }),
    prisma.treatment.count({
      where: {
        status: 'COMPLETED',
        performedAt: { gte: startOfMonth },
      },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { paidAt: { gte: startOfMonth } },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { paidAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
    }),
    prisma.invoice.count({
      where: { status: { in: ['PENDING', 'OVERDUE'] } },
    }),
  ]);

  const currentRevenue = Number(revenueThisMonth._sum.amount) || 0;
  const lastRevenue = Number(revenueLastMonth._sum.amount) || 0;
  const revenueGrowth = lastRevenue > 0
    ? ((currentRevenue - lastRevenue) / lastRevenue) * 100
    : 0;

  const patientGrowth = newPatientsLastMonth > 0
    ? ((newPatientsThisMonth - newPatientsLastMonth) / newPatientsLastMonth) * 100
    : 0;

  return {
    patients: {
      total: totalPatients,
      newThisMonth: newPatientsThisMonth,
      growth: Math.round(patientGrowth * 10) / 10,
    },
    appointments: {
      total: totalAppointments,
      thisMonth: appointmentsThisMonth,
      upcoming: upcomingAppointments,
    },
    treatments: {
      completedThisMonth: completedTreatmentsThisMonth,
    },
    revenue: {
      thisMonth: currentRevenue,
      lastMonth: lastRevenue,
      growth: Math.round(revenueGrowth * 10) / 10,
    },
    billing: {
      pendingInvoices,
    },
  };
}

export async function getDashboardAlerts() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [overdueInvoices, lowStockSupplies, todaysAppointments, overdueRecalls] = await Promise.all([
    // Overdue invoices
    prisma.invoice.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIALLY_PAID'] },
        dueDate: { lt: today },
      },
      take: 10,
      orderBy: { dueDate: 'asc' },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        payments: { select: { amount: true } },
      },
    }),
    // Low stock supplies
    prisma.supply.findMany({
      where: { isActive: true },
      select: { id: true, name: true, currentStock: true, minimumStock: true, unit: true },
    }),
    // Today's appointments
    prisma.appointment.findMany({
      where: {
        startTime: { gte: today, lt: tomorrow },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      take: 10,
      orderBy: { startTime: 'asc' },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        dentist: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    // Overdue recalls
    prisma.recallSchedule.findMany({
      where: {
        isActive: true,
        status: { not: 'COMPLETED' },
        nextDueDate: { lt: today },
      },
      take: 10,
      orderBy: { nextDueDate: 'asc' },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    }),
  ]);

  const filteredLowStock = lowStockSupplies.filter(s => s.currentStock <= s.minimumStock).slice(0, 10);

  const overdueInvoicesWithBalance = overdueInvoices.map(inv => {
    const paid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    return {
      id: inv.id,
      invoiceNumber: (inv as any).invoiceNumber,
      total: Number(inv.total),
      balance: Number(inv.total) - paid,
      dueDate: inv.dueDate,
      patient: inv.patient,
    };
  });

  return {
    overdueInvoices: {
      count: overdueInvoicesWithBalance.length,
      items: overdueInvoicesWithBalance,
    },
    lowStock: {
      count: filteredLowStock.length,
      items: filteredLowStock,
    },
    todaysAppointments: {
      count: todaysAppointments.length,
      items: todaysAppointments,
    },
    overdueRecalls: {
      count: overdueRecalls.length,
      items: overdueRecalls,
    },
  };
}

export async function getTreatmentAnalytics(filters: { startDate?: string; endDate?: string }) {
  const dateFilter: any = {};
  if (filters.startDate) {
    dateFilter.gte = new Date(filters.startDate);
  }
  if (filters.endDate) {
    dateFilter.lte = new Date(filters.endDate);
  }

  const treatments = await prisma.treatment.groupBy({
    by: ['procedureName'],
    _count: { id: true },
    _sum: { cost: true },
    where: filters.startDate || filters.endDate ? { performedAt: dateFilter } : undefined,
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  const statusBreakdown = await prisma.treatment.groupBy({
    by: ['status'],
    _count: { id: true },
    where: filters.startDate || filters.endDate ? { performedAt: dateFilter } : undefined,
  });

  return {
    byProcedure: treatments.map(t => ({
      procedure: t.procedureName,
      count: t._count.id,
      totalRevenue: Number(t._sum.cost) || 0,
    })),
    byStatus: statusBreakdown.map(s => ({
      status: s.status,
      count: s._count.id,
    })),
  };
}

export async function getRevenueAnalytics(filters: { months?: number }) {
  const monthCount = Math.min(24, Math.max(1, filters.months || 12));

  const results: { month: string; revenue: number; payments: number }[] = [];

  for (let i = monthCount - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const payments = await prisma.payment.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where: {
        paidAt: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    results.push({
      month: startOfMonth.toISOString().slice(0, 7),
      revenue: Number(payments._sum.amount) || 0,
      payments: payments._count.id,
    });
  }

  const byMethod = await prisma.payment.groupBy({
    by: ['method'],
    _sum: { amount: true },
    _count: { id: true },
  });

  return {
    monthly: results,
    byMethod: byMethod.map(m => ({
      method: m.method,
      total: Number(m._sum.amount) || 0,
      count: m._count.id,
    })),
  };
}

export async function getPatientAnalytics(filters: { months?: number }) {
  const monthCount = Math.min(24, Math.max(1, filters.months || 12));

  const results: { month: string; newPatients: number; totalActive: number }[] = [];

  for (let i = monthCount - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const [newPatients, totalActive] = await Promise.all([
      prisma.patient.count({
        where: {
          createdAt: { gte: startOfMonth, lte: endOfMonth },
          isActive: true,
        },
      }),
      prisma.patient.count({
        where: {
          createdAt: { lte: endOfMonth },
          isActive: true,
        },
      }),
    ]);

    results.push({
      month: startOfMonth.toISOString().slice(0, 7),
      newPatients,
      totalActive,
    });
  }

  const genderBreakdown = await prisma.patient.groupBy({
    by: ['gender'],
    _count: { id: true },
    where: { isActive: true },
  });

  const patients = await prisma.patient.findMany({
    where: { isActive: true },
    select: { dateOfBirth: true },
  });

  const ageGroups: Record<string, number> = {
    '0-17': 0,
    '18-34': 0,
    '35-54': 0,
    '55-74': 0,
    '75+': 0,
  };

  const today = new Date();
  patients.forEach(p => {
    const age = Math.floor((today.getTime() - new Date(p.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age < 18) ageGroups['0-17']++;
    else if (age < 35) ageGroups['18-34']++;
    else if (age < 55) ageGroups['35-54']++;
    else if (age < 75) ageGroups['55-74']++;
    else ageGroups['75+']++;
  });

  return {
    monthly: results,
    byGender: genderBreakdown.map(g => ({
      gender: g.gender || 'Unknown',
      count: g._count.id,
    })),
    byAge: Object.entries(ageGroups).map(([range, count]) => ({
      range,
      count,
    })),
  };
}

export async function getConditionAnalytics() {
  const conditionDistribution = await prisma.tooth.groupBy({
    by: ['currentCondition'],
    _count: { id: true },
  });

  const affectedTeeth = await prisma.tooth.groupBy({
    by: ['toothNumber'],
    _count: { id: true },
    where: {
      currentCondition: { not: 'HEALTHY' },
    },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  const surfaceDistribution = await prisma.toothSurface.groupBy({
    by: ['surface', 'condition'],
    _count: { id: true },
    where: {
      condition: { not: 'HEALTHY' },
    },
  });

  return {
    byCondition: conditionDistribution.map(c => ({
      condition: c.currentCondition,
      count: c._count.id,
    })),
    mostAffectedTeeth: affectedTeeth.map(t => ({
      toothNumber: t.toothNumber,
      affectedCount: t._count.id,
    })),
    bySurface: surfaceDistribution.map(s => ({
      surface: s.surface,
      condition: s.condition,
      count: s._count.id,
    })),
  };
}
