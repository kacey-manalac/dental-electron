import { PrismaClient } from '@prisma/client';
import path from 'path';
import { app } from 'electron';

const dbPath = path.join(app.getPath('userData'), 'dental-clinic.db');
process.env.DATABASE_URL = `file:${dbPath}`;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`,
    },
  },
});

export { prisma };
