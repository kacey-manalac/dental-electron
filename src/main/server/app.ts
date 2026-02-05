import path from 'path';
import fs from 'fs';
import { app as electronApp } from 'electron';
import { execSync } from 'child_process';

export async function initDatabase() {
  const dbPath = path.join(electronApp.getPath('userData'), 'dental-clinic.db');
  process.env.DATABASE_URL = `file:${dbPath}`;

  if (!fs.existsSync(dbPath)) {
    const seedDbPath = path.join(__dirname, '../../../prisma/dev.db');
    if (fs.existsSync(seedDbPath)) {
      fs.copyFileSync(seedDbPath, dbPath);
      console.log('Copied seed database to:', dbPath);
    } else {
      const schemaPath = path.join(__dirname, '../../../prisma/schema.prisma');
      try {
        execSync(`npx prisma db push --schema="${schemaPath}" --skip-generate`, {
          env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
          stdio: 'pipe',
        });
        console.log('Database created at:', dbPath);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
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
