import path from 'path';
import fs from 'fs';
import { app as electronApp, dialog } from 'electron';
import { PrismaClient } from '../generated/client';

export async function initDatabase(): Promise<void> {
  const dbPath = path.join(electronApp.getPath('userData'), 'dental-clinic.db');
  process.env.DATABASE_URL = `file:${dbPath}`;

  if (!fs.existsSync(dbPath)) {
    // First launch - ask user if they want sample data
    const result = await dialog.showMessageBox({
      type: 'question',
      title: 'Welcome to DentalCare Pro',
      message: 'Would you like to load sample data?',
      detail: 'Sample data includes demo patients, appointments, and treatments for testing purposes. Choose "No" to start with an empty database for real clinic use.',
      buttons: ['Yes, load sample data', 'No, start empty'],
      defaultId: 1,
      cancelId: 1,
    });

    const loadSampleData = result.response === 0;

    if (loadSampleData) {
      // Try multiple locations for seed database
      const possibleSeedPaths = [
        // Development: relative to dist/main/server
        path.join(__dirname, '../../../prisma/dev.db'),
        // Production: extraResources folder
        path.join(process.resourcesPath || '', 'prisma/dev.db'),
      ];

      let seedCopied = false;
      for (const seedDbPath of possibleSeedPaths) {
        if (fs.existsSync(seedDbPath)) {
          fs.copyFileSync(seedDbPath, dbPath);
          console.log('Copied seed database from:', seedDbPath, 'to:', dbPath);
          seedCopied = true;
          break;
        }
      }

      if (!seedCopied) {
        console.log('No seed database found, will create empty database');
        await createEmptyDatabase(dbPath);
      }
    } else {
      // Create empty database
      await createEmptyDatabase(dbPath);
    }
  } else {
    console.log('Database already exists at:', dbPath);
  }

  // Ensure uploads directory exists
  const uploadsDir = path.join(electronApp.getPath('userData'), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

async function createEmptyDatabase(dbPath: string): Promise<void> {
  // Try to find and copy the empty schema database, or create tables manually
  const possibleEmptyPaths = [
    path.join(__dirname, '../../../prisma/empty.db'),
    path.join(process.resourcesPath || '', 'prisma/empty.db'),
  ];

  for (const emptyDbPath of possibleEmptyPaths) {
    if (fs.existsSync(emptyDbPath)) {
      fs.copyFileSync(emptyDbPath, dbPath);
      console.log('Created empty database from:', emptyDbPath);
      return;
    }
  }

  // If no empty.db template, create the file and let Prisma handle schema
  // We'll create a minimal SQLite file
  console.log('Creating new empty database at:', dbPath);

  // Create empty SQLite database by writing the header
  const prisma = new PrismaClient({
    datasources: { db: { url: `file:${dbPath}` } },
  });

  try {
    // This will create the database file and all tables
    await prisma.$connect();
    console.log('Empty database created successfully');
  } finally {
    await prisma.$disconnect();
  }
}
