import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../utils/prisma';
import { getPaginationParams, createPaginatedResponse } from '../utils/helpers';
import { getUploadsDir } from '../middleware/upload';

export async function uploadImages(
  patientId: string,
  filePaths: string[],
  options: { category?: string; description?: string; toothId?: string }
) {
  const { category = 'general', description, toothId } = options;

  if (!filePaths || filePaths.length === 0) {
    throw new Error('No files provided');
  }

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    throw new Error('Patient not found');
  }

  // Get first user for uploadedBy (single-user desktop app)
  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!user) {
    throw new Error('No user found in database');
  }

  if (toothId) {
    const tooth = await prisma.tooth.findFirst({
      where: { id: toothId, patientId },
    });
    if (!tooth) {
      throw new Error('Tooth not found');
    }
  }

  const uploadsDir = getUploadsDir();
  const images = [];

  for (const filePath of filePaths) {
    const ext = path.extname(filePath);
    const originalName = path.basename(filePath);
    const storedName = `${uuidv4()}${ext}`;
    const destPath = path.join(uploadsDir, storedName);

    await fs.promises.copyFile(filePath, destPath);

    const stats = await fs.promises.stat(destPath);

    const extToMime: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    const mimeType = extToMime[ext.toLowerCase()] || 'image/jpeg';

    const image = await prisma.patientImage.create({
      data: {
        patientId,
        toothId: toothId || null,
        filename: originalName,
        storedName,
        mimeType,
        size: stats.size,
        category,
        description,
        uploadedBy: user.id,
      },
      include: {
        uploader: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    images.push(image);
  }

  await prisma.auditLog.create({
    data: {
      userId: null,
      action: 'UPLOAD',
      entityType: 'patient_image',
      entityId: patientId,
      newValues: { fileCount: filePaths.length, category },
    },
  });

  return images;
}

export async function getPatientImages(
  patientId: string,
  filters: { page?: number; limit?: number; category?: string; toothId?: string; sortBy?: string; sortOrder?: string }
) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    throw new Error('Patient not found');
  }

  const { page, limit, sortBy, sortOrder } = getPaginationParams(filters);
  const skip = (page - 1) * limit;

  const where: any = { patientId };
  if (filters.category) where.category = filters.category;
  if (filters.toothId) where.toothId = filters.toothId;

  const [images, total] = await Promise.all([
    prisma.patientImage.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy === 'createdAt' ? 'createdAt' : sortBy]: sortOrder },
      include: {
        uploader: {
          select: { id: true, firstName: true, lastName: true },
        },
        tooth: {
          select: { id: true, toothNumber: true, fdiNumber: true },
        },
      },
    }),
    prisma.patientImage.count({ where }),
  ]);

  return createPaginatedResponse(images, total, page, limit);
}

export async function deleteImage(imageId: string) {
  const image = await prisma.patientImage.findUnique({
    where: { id: imageId },
  });

  if (!image) {
    throw new Error('Image not found');
  }

  const filePath = path.join(getUploadsDir(), image.storedName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await prisma.patientImage.delete({ where: { id: imageId } });

  await prisma.auditLog.create({
    data: {
      userId: null,
      action: 'DELETE',
      entityType: 'patient_image',
      entityId: imageId,
      oldValues: { filename: image.filename, patientId: image.patientId },
    },
  });

  return null;
}
