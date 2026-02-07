import { prisma } from '../utils/prisma';

export async function globalSearch(query: string) {
  if (!query || query.length < 2) {
    return { patients: [], appointments: [], treatments: [], invoices: [] };
  }

  const [patients, appointments, treatments, invoices] = await Promise.all([
    prisma.patient.findMany({
      where: {
        isActive: true,
        OR: [
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { email: { contains: query } },
          { phone: { contains: query } },
        ],
      },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
      },
    }),
    prisma.appointment.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { patient: { firstName: { contains: query } } },
          { patient: { lastName: { contains: query } } },
        ],
      },
      take: 5,
      orderBy: { startTime: 'desc' },
      select: {
        id: true,
        title: true,
        startTime: true,
        status: true,
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.treatment.findMany({
      where: {
        OR: [
          { procedureName: { contains: query } },
          { procedureCode: { contains: query } },
          { patient: { firstName: { contains: query } } },
          { patient: { lastName: { contains: query } } },
        ],
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        procedureName: true,
        cost: true,
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.invoice.findMany({
      where: {
        OR: [
          { invoiceNumber: { contains: query } },
          { patient: { firstName: { contains: query } } },
          { patient: { lastName: { contains: query } } },
        ],
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        status: true,
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
  ]);

  return { patients, appointments, treatments, invoices };
}
