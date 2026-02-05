import path from 'path';
import fs from 'fs';
import { app } from 'electron';

// Ensure uploads directory exists in userData
const uploadsDir = path.join(app.getPath('userData'), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Get the uploads directory path
export const getUploadsDir = () => uploadsDir;
