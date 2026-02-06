import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import AdmZip from 'adm-zip';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeBackupData(overrides: Record<string, any> = {}) {
  return {
    version: '2.0.0',
    exportedAt: '2025-06-01T12:00:00.000Z',
    exportedBy: 'local',
    data: {
      users: [{ id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'ADMIN', phone: '123', isActive: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' }],
      patients: [{ id: 'p1', firstName: 'John', lastName: 'Doe' }],
      medicalHistories: [{ id: 'mh1', patientId: 'p1' }],
      teeth: [{ id: 't1', patientId: 'p1', toothNumber: 11 }],
      toothConditionHistories: [],
      toothSurfaces: [],
      appointments: [{ id: 'a1', patientId: 'p1' }],
      treatments: [{ id: 'tr1', patientId: 'p1' }],
      invoices: [{ id: 'inv1', patientId: 'p1' }],
      invoiceItems: [],
      payments: [],
      patientImages: [{ id: 'img1', patientId: 'p1', storedName: 'photo.jpg' }],
      auditLogs: [],
      ...overrides,
    },
    metadata: {
      counts: {
        users: 1,
        patients: 1,
        teeth: 1,
        appointments: 1,
        treatments: 1,
        invoices: 1,
        payments: 0,
        images: 1,
      },
      note: 'Full backup including database records, patient images, and clinic settings.',
    },
  };
}

function makeV1BackupData() {
  const backup = makeBackupData();
  backup.version = '1.0.0';
  backup.metadata.note = 'Old v1 backup';
  return backup;
}

const CLINIC_SETTINGS = {
  name: 'Test Dental Clinic',
  address: '123 Main St',
  phone: '555-1234',
  email: 'info@test.com',
};

// ---------------------------------------------------------------------------
// Temp directory management
// ---------------------------------------------------------------------------

let tmpDir: string;

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dental-backup-test-'));
}

function cleanupDir(dir: string) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch { /* ignore */ }
}

// Create a helper to build a real ZIP file on disk
function createTestZip(options: {
  backupData?: any;
  includeImages?: boolean;
  includeClinicSettings?: boolean;
  imageFiles?: { name: string; content: Buffer }[];
  extraEntries?: { name: string; content: Buffer }[];
} = {}): string {
  const {
    backupData = makeBackupData(),
    includeImages = true,
    includeClinicSettings = true,
    imageFiles = [{ name: 'photo.jpg', content: Buffer.from('fake-jpg-data') }],
    extraEntries = [],
  } = options;

  const zip = new AdmZip();
  zip.addFile('backup.json', Buffer.from(JSON.stringify(backupData, null, 2)));

  if (includeImages) {
    for (const img of imageFiles) {
      zip.addFile(`uploads/${img.name}`, img.content);
    }
  }

  if (includeClinicSettings) {
    zip.addFile('clinic-settings.json', Buffer.from(JSON.stringify(CLINIC_SETTINGS)));
  }

  for (const entry of extraEntries) {
    zip.addFile(entry.name, entry.content);
  }

  const zipPath = path.join(tmpDir, `test-backup-${Date.now()}.zip`);
  zip.writeZip(zipPath);
  return zipPath;
}

function createTestJson(backupData?: any): string {
  const data = backupData ?? makeBackupData();
  const jsonPath = path.join(tmpDir, `test-backup-${Date.now()}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  return jsonPath;
}

// ---------------------------------------------------------------------------
// Mocks — vi.hoisted runs before vi.mock factories are evaluated
// ---------------------------------------------------------------------------

const { prismaMock, mockElectron } = vi.hoisted(() => {
  const modelNames = [
    'user', 'patient', 'medicalHistory', 'tooth',
    'toothConditionHistory', 'toothSurface', 'appointment',
    'treatment', 'invoice', 'invoiceItem', 'payment',
    'patientImage', 'auditLog',
  ];

  const createModel = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    count: vi.fn().mockResolvedValue(0),
    createMany: vi.fn().mockResolvedValue({ count: 0 }),
    create: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
  });

  const mock: any = {
    $transaction: vi.fn(async (fn: (tx: any) => Promise<any>) => {
      const tx: any = {};
      for (const name of modelNames) {
        tx[name] = createModel();
      }
      return fn(tx);
    }),
  };

  for (const name of modelNames) {
    mock[name] = createModel();
  }

  // We store a mutable ref for the userData path so tests can change tmpDir
  const pathRef = { userData: '' };

  const electron = {
    app: { getPath: vi.fn((name: string) => { if (name === 'userData') return pathRef.userData; return ''; }) },
    dialog: { showSaveDialog: vi.fn() },
    BrowserWindow: { getFocusedWindow: vi.fn(() => ({})) },
    pathRef,
  };

  return { prismaMock: mock, mockElectron: electron };
});

vi.mock('electron', () => ({
  app: mockElectron.app,
  dialog: mockElectron.dialog,
  BrowserWindow: mockElectron.BrowserWindow,
}));

vi.mock('../utils/prisma', () => ({
  prisma: prismaMock,
}));

// ---------------------------------------------------------------------------
// Import module under test AFTER mocks
// ---------------------------------------------------------------------------

import {
  createBackup,
  restoreBackup,
  previewBackup,
  getSystemInfo,
} from './admin';

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

beforeEach(() => {
  tmpDir = makeTmpDir();
  mockElectron.pathRef.userData = tmpDir;
  vi.clearAllMocks();

  // Reset prisma mock defaults
  prismaMock.user.findMany.mockResolvedValue([{ id: 'u1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'ADMIN', phone: '123', isActive: true, createdAt: '2025-01-01', updatedAt: '2025-01-01' }]);
  prismaMock.patient.findMany.mockResolvedValue([{ id: 'p1', firstName: 'John', lastName: 'Doe' }]);
  prismaMock.medicalHistory.findMany.mockResolvedValue([]);
  prismaMock.tooth.findMany.mockResolvedValue([]);
  prismaMock.toothConditionHistory.findMany.mockResolvedValue([]);
  prismaMock.toothSurface.findMany.mockResolvedValue([]);
  prismaMock.appointment.findMany.mockResolvedValue([]);
  prismaMock.treatment.findMany.mockResolvedValue([]);
  prismaMock.invoice.findMany.mockResolvedValue([]);
  prismaMock.invoiceItem.findMany.mockResolvedValue([]);
  prismaMock.payment.findMany.mockResolvedValue([]);
  prismaMock.patientImage.findMany.mockResolvedValue([]);
  prismaMock.auditLog.findMany.mockResolvedValue([]);
  prismaMock.auditLog.create.mockResolvedValue({});
});

afterEach(() => {
  cleanupDir(tmpDir);
});

// ---------------------------------------------------------------------------
// createBackup
// ---------------------------------------------------------------------------

describe('createBackup', () => {
  it('returns null filePath when save dialog is canceled', async () => {
    (mockElectron.dialog.showSaveDialog as any).mockResolvedValue({ canceled: true, filePath: undefined });

    const result = await createBackup();
    expect(result.filePath).toBeNull();
  });

  it('creates a valid ZIP file with backup.json', async () => {
    const savePath = path.join(tmpDir, 'backup.zip');
    (mockElectron.dialog.showSaveDialog as any).mockResolvedValue({ canceled: false, filePath: savePath });

    const result = await createBackup();
    expect(result.filePath).toBe(savePath);
    expect(fs.existsSync(savePath)).toBe(true);

    // Verify ZIP contents
    const zip = new AdmZip(savePath);
    const backupEntry = zip.getEntry('backup.json');
    expect(backupEntry).not.toBeNull();

    const parsed = JSON.parse(backupEntry!.getData().toString('utf-8'));
    expect(parsed.version).toBe('2.0.0');
    expect(parsed.data).toBeDefined();
    expect(parsed.metadata).toBeDefined();
    expect(parsed.metadata.counts).toBeDefined();
  });

  it('includes uploads directory when it exists', async () => {
    // Create a fake uploads dir with images
    const uploadsDir = path.join(tmpDir, 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, 'test-image.jpg'), 'fake-image-data');
    fs.writeFileSync(path.join(uploadsDir, 'xray.png'), 'fake-xray-data');

    const savePath = path.join(tmpDir, 'backup.zip');
    (mockElectron.dialog.showSaveDialog as any).mockResolvedValue({ canceled: false, filePath: savePath });

    await createBackup();

    const zip = new AdmZip(savePath);
    const entries = zip.getEntries().map(e => e.entryName);
    expect(entries).toContain('uploads/test-image.jpg');
    expect(entries).toContain('uploads/xray.png');
  });

  it('includes clinic-settings.json when it exists', async () => {
    const settingsPath = path.join(tmpDir, 'clinic-settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(CLINIC_SETTINGS));

    const savePath = path.join(tmpDir, 'backup.zip');
    (mockElectron.dialog.showSaveDialog as any).mockResolvedValue({ canceled: false, filePath: savePath });

    await createBackup();

    const zip = new AdmZip(savePath);
    const settingsEntry = zip.getEntry('clinic-settings.json');
    expect(settingsEntry).not.toBeNull();

    const parsed = JSON.parse(settingsEntry!.getData().toString('utf-8'));
    expect(parsed.name).toBe('Test Dental Clinic');
  });

  it('works when neither uploads dir nor clinic-settings exist', async () => {
    const savePath = path.join(tmpDir, 'backup.zip');
    (mockElectron.dialog.showSaveDialog as any).mockResolvedValue({ canceled: false, filePath: savePath });

    await createBackup();

    const zip = new AdmZip(savePath);
    const entries = zip.getEntries().map(e => e.entryName);
    expect(entries).toContain('backup.json');
    // No uploads or clinic-settings entries
    expect(entries.filter(e => e.startsWith('uploads/'))).toHaveLength(0);
    expect(entries).not.toContain('clinic-settings.json');
  });

  it('creates an audit log entry', async () => {
    const savePath = path.join(tmpDir, 'backup.zip');
    (mockElectron.dialog.showSaveDialog as any).mockResolvedValue({ canceled: false, filePath: savePath });

    await createBackup();

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'BACKUP',
          entityType: 'system',
        }),
      })
    );
  });

  it('backup.json contains correct version and metadata structure', async () => {
    prismaMock.patient.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]);
    prismaMock.appointment.findMany.mockResolvedValue([{ id: 'a1' }]);

    const savePath = path.join(tmpDir, 'backup.zip');
    (mockElectron.dialog.showSaveDialog as any).mockResolvedValue({ canceled: false, filePath: savePath });

    await createBackup();

    const zip = new AdmZip(savePath);
    const parsed = JSON.parse(zip.getEntry('backup.json')!.getData().toString('utf-8'));

    expect(parsed.version).toBe('2.0.0');
    expect(parsed.exportedBy).toBe('local');
    expect(parsed.exportedAt).toBeTruthy();
    expect(parsed.metadata.counts.patients).toBe(3);
    expect(parsed.metadata.counts.appointments).toBe(1);
    expect(parsed.data.patients).toHaveLength(3);
  });

  it('save dialog defaults to .zip extension', async () => {
    (mockElectron.dialog.showSaveDialog as any).mockResolvedValue({ canceled: true });

    await createBackup();

    const callArgs = (mockElectron.dialog.showSaveDialog as any).mock.calls[0][1];
    expect(callArgs.defaultPath).toMatch(/\.zip$/);
    expect(callArgs.filters[0].extensions).toContain('zip');
  });
});

// ---------------------------------------------------------------------------
// previewBackup
// ---------------------------------------------------------------------------

describe('previewBackup', () => {
  describe('input validation', () => {
    it('throws on empty string', async () => {
      await expect(previewBackup('')).rejects.toThrow('Invalid file path');
    });

    it('throws on non-string input', async () => {
      await expect(previewBackup(null as any)).rejects.toThrow('Invalid file path');
      await expect(previewBackup(undefined as any)).rejects.toThrow('Invalid file path');
    });

    it('throws on unsupported file extension', async () => {
      const txtPath = path.join(tmpDir, 'backup.txt');
      fs.writeFileSync(txtPath, 'hello');
      await expect(previewBackup(txtPath)).rejects.toThrow('Unsupported backup file format');
    });
  });

  describe('ZIP preview', () => {
    it('returns correct metadata for a full backup ZIP', async () => {
      const zipPath = createTestZip();

      const info = await previewBackup(zipPath);
      expect(info.version).toBe('2.0.0');
      expect(info.exportedAt).toBe('2025-06-01T12:00:00.000Z');
      expect(info.hasImages).toBe(true);
      expect(info.imageCount).toBe(1);
      expect(info.hasClinicSettings).toBe(true);
      expect(info.metadata.counts.patients).toBe(1);
    });

    it('reports zero images when uploads folder is absent', async () => {
      const zipPath = createTestZip({ includeImages: false });

      const info = await previewBackup(zipPath);
      expect(info.hasImages).toBe(false);
      expect(info.imageCount).toBe(0);
    });

    it('counts multiple image files correctly', async () => {
      const zipPath = createTestZip({
        imageFiles: [
          { name: 'img1.jpg', content: Buffer.from('a') },
          { name: 'img2.png', content: Buffer.from('b') },
          { name: 'img3.gif', content: Buffer.from('c') },
        ],
      });

      const info = await previewBackup(zipPath);
      expect(info.imageCount).toBe(3);
      expect(info.hasImages).toBe(true);
    });

    it('reports clinic settings absent when not in ZIP', async () => {
      const zipPath = createTestZip({ includeClinicSettings: false });

      const info = await previewBackup(zipPath);
      expect(info.hasClinicSettings).toBe(false);
    });

    it('throws when backup.json is missing from ZIP', async () => {
      const zip = new AdmZip();
      zip.addFile('not-backup.json', Buffer.from('{}'));
      const zipPath = path.join(tmpDir, 'bad.zip');
      zip.writeZip(zipPath);

      await expect(previewBackup(zipPath)).rejects.toThrow('missing backup.json');
    });

    it('throws when backup.json has invalid structure', async () => {
      const zip = new AdmZip();
      zip.addFile('backup.json', Buffer.from(JSON.stringify({ foo: 'bar' })));
      const zipPath = path.join(tmpDir, 'bad2.zip');
      zip.writeZip(zipPath);

      await expect(previewBackup(zipPath)).rejects.toThrow('Invalid backup file format');
    });

    it('throws when backup.json contains invalid JSON', async () => {
      const zip = new AdmZip();
      zip.addFile('backup.json', Buffer.from('not valid json!!!'));
      const zipPath = path.join(tmpDir, 'badjson.zip');
      zip.writeZip(zipPath);

      await expect(previewBackup(zipPath)).rejects.toThrow();
    });
  });

  describe('JSON preview', () => {
    it('returns correct metadata for a v1 JSON backup', async () => {
      const jsonPath = createTestJson(makeV1BackupData());

      const info = await previewBackup(jsonPath);
      expect(info.version).toBe('1.0.0');
      expect(info.hasImages).toBe(false);
      expect(info.imageCount).toBe(0);
      expect(info.hasClinicSettings).toBe(false);
    });

    it('returns correct metadata for a v2 JSON backup', async () => {
      const jsonPath = createTestJson(makeBackupData());

      const info = await previewBackup(jsonPath);
      expect(info.version).toBe('2.0.0');
      expect(info.metadata.counts.patients).toBe(1);
      // JSON preview never reports images or clinic settings
      expect(info.hasImages).toBe(false);
      expect(info.hasClinicSettings).toBe(false);
    });

    it('throws on invalid JSON content', async () => {
      const jsonPath = path.join(tmpDir, 'bad.json');
      fs.writeFileSync(jsonPath, 'NOT JSON AT ALL');

      await expect(previewBackup(jsonPath)).rejects.toThrow();
    });

    it('throws on missing version field', async () => {
      const jsonPath = createTestJson({ data: {}, metadata: {} });

      await expect(previewBackup(jsonPath)).rejects.toThrow('Invalid backup file format');
    });

    it('throws on missing data field', async () => {
      const jsonPath = createTestJson({ version: '2.0.0', metadata: {} });

      await expect(previewBackup(jsonPath)).rejects.toThrow('Invalid backup file format');
    });
  });
});

// ---------------------------------------------------------------------------
// restoreBackup
// ---------------------------------------------------------------------------

describe('restoreBackup', () => {
  describe('input validation', () => {
    it('throws on empty string', async () => {
      await expect(restoreBackup('')).rejects.toThrow('Invalid file path');
    });

    it('throws on non-string input', async () => {
      await expect(restoreBackup(123 as any)).rejects.toThrow('Invalid file path');
      await expect(restoreBackup(null as any)).rejects.toThrow('Invalid file path');
    });

    it('throws on unsupported extension', async () => {
      const xmlPath = path.join(tmpDir, 'backup.xml');
      fs.writeFileSync(xmlPath, '<xml/>');
      await expect(restoreBackup(xmlPath)).rejects.toThrow('Unsupported backup file format');
    });
  });

  describe('JSON restore (backward compatibility)', () => {
    it('restores v1.0.0 JSON backup successfully', async () => {
      const jsonPath = createTestJson(makeV1BackupData());

      const result = await restoreBackup(jsonPath);
      expect(result.message).toContain('database only');
      expect(result.backupDate).toBe('2025-06-01T12:00:00.000Z');
    });

    it('restores v2.0.0 JSON backup successfully', async () => {
      const jsonPath = createTestJson(makeBackupData());

      const result = await restoreBackup(jsonPath);
      expect(result.message).toContain('database only');
    });

    it('rejects unsupported version in JSON', async () => {
      const data = makeBackupData();
      data.version = '3.0.0';
      const jsonPath = createTestJson(data);

      await expect(restoreBackup(jsonPath)).rejects.toThrow('Unsupported backup version: 3.0.0');
    });

    it('rejects JSON with missing required tables', async () => {
      const data = makeBackupData({ patients: 'not-an-array' });
      const jsonPath = createTestJson(data);

      await expect(restoreBackup(jsonPath)).rejects.toThrow('Missing or invalid data for: patients');
    });

    it('rejects JSON with missing appointments', async () => {
      const data = makeBackupData();
      delete data.data.appointments;
      const jsonPath = createTestJson(data);

      await expect(restoreBackup(jsonPath)).rejects.toThrow('Missing or invalid data for: appointments');
    });

    it('rejects JSON with invalid format (no version)', async () => {
      const jsonPath = createTestJson({ data: { patients: [] } });

      await expect(restoreBackup(jsonPath)).rejects.toThrow('Invalid backup file format');
    });

    it('rejects JSON with invalid format (no data)', async () => {
      const jsonPath = createTestJson({ version: '1.0.0' });

      await expect(restoreBackup(jsonPath)).rejects.toThrow('Invalid backup file format');
    });

    it('calls prisma $transaction to delete then create records', async () => {
      const jsonPath = createTestJson(makeBackupData());

      await restoreBackup(jsonPath);
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('creates an audit log entry on restore', async () => {
      const jsonPath = createTestJson(makeBackupData());

      await restoreBackup(jsonPath);
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'RESTORE',
            entityType: 'system',
          }),
        })
      );
    });

    it('returns restored counts from the transaction', async () => {
      const data = makeBackupData();
      const jsonPath = createTestJson(data);

      const result = await restoreBackup(jsonPath);
      expect(result.restoredCounts).toBeDefined();
      // patients should be restored (1 patient in fixture)
      expect(result.restoredCounts.patients).toBe(1);
    });

    it('handles empty arrays gracefully (no createMany called)', async () => {
      const data = makeBackupData({
        patients: [],
        medicalHistories: [],
        teeth: [],
        toothConditionHistories: [],
        toothSurfaces: [],
        appointments: [],
        treatments: [],
        invoices: [],
        invoiceItems: [],
        payments: [],
        patientImages: [],
      });
      const jsonPath = createTestJson(data);

      const result = await restoreBackup(jsonPath);
      // Counts object should be empty since no data was restored
      expect(Object.keys(result.restoredCounts)).toHaveLength(0);
    });
  });

  describe('ZIP restore', () => {
    it('restores database data from ZIP', async () => {
      const zipPath = createTestZip();

      const result = await restoreBackup(zipPath);
      expect(result.restoredCounts).toBeDefined();
      expect(result.restoredCounts.patients).toBe(1);
      expect(result.backupDate).toBe('2025-06-01T12:00:00.000Z');
    });

    it('extracts image files to uploads directory', async () => {
      const imageContent = Buffer.from('real-image-binary-data-here');
      const zipPath = createTestZip({
        imageFiles: [
          { name: 'photo1.jpg', content: imageContent },
          { name: 'xray.png', content: Buffer.from('xray-data') },
        ],
      });

      await restoreBackup(zipPath);

      const uploadsDir = path.join(tmpDir, 'uploads');
      expect(fs.existsSync(path.join(uploadsDir, 'photo1.jpg'))).toBe(true);
      expect(fs.existsSync(path.join(uploadsDir, 'xray.png'))).toBe(true);
      expect(fs.readFileSync(path.join(uploadsDir, 'photo1.jpg'))).toEqual(imageContent);
    });

    it('creates uploads directory if it does not exist', async () => {
      const uploadsDir = path.join(tmpDir, 'uploads');
      // Ensure it doesn't exist
      if (fs.existsSync(uploadsDir)) fs.rmSync(uploadsDir, { recursive: true });

      const zipPath = createTestZip();
      await restoreBackup(zipPath);

      expect(fs.existsSync(uploadsDir)).toBe(true);
    });

    it('restores clinic-settings.json', async () => {
      const zipPath = createTestZip();

      await restoreBackup(zipPath);

      const settingsPath = path.join(tmpDir, 'clinic-settings.json');
      expect(fs.existsSync(settingsPath)).toBe(true);

      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      expect(settings.name).toBe('Test Dental Clinic');
      expect(settings.phone).toBe('555-1234');
    });

    it('message includes image count when images are restored', async () => {
      const zipPath = createTestZip({
        imageFiles: [
          { name: 'a.jpg', content: Buffer.from('a') },
          { name: 'b.png', content: Buffer.from('b') },
        ],
      });

      const result = await restoreBackup(zipPath);
      expect(result.message).toContain('2 image files restored');
    });

    it('message includes clinic settings note when restored', async () => {
      const zipPath = createTestZip();

      const result = await restoreBackup(zipPath);
      expect(result.message).toContain('clinic settings restored');
    });

    it('message omits image/settings notes when they are absent', async () => {
      const zipPath = createTestZip({
        includeImages: false,
        includeClinicSettings: false,
      });

      const result = await restoreBackup(zipPath);
      expect(result.message).toBe('Backup restored successfully');
      expect(result.message).not.toContain('image');
      expect(result.message).not.toContain('clinic settings');
    });

    it('skips dotfiles in uploads directory (path traversal protection)', async () => {
      const zip = new AdmZip();
      zip.addFile('backup.json', Buffer.from(JSON.stringify(makeBackupData())));
      zip.addFile('uploads/.hidden', Buffer.from('secret'));
      zip.addFile('uploads/.htaccess', Buffer.from('deny all'));
      zip.addFile('uploads/legit.jpg', Buffer.from('ok'));
      const zipPath = path.join(tmpDir, 'dotfile.zip');
      zip.writeZip(zipPath);

      await restoreBackup(zipPath);

      const uploadsDir = path.join(tmpDir, 'uploads');
      expect(fs.existsSync(path.join(uploadsDir, 'legit.jpg'))).toBe(true);
      expect(fs.existsSync(path.join(uploadsDir, '.hidden'))).toBe(false);
      expect(fs.existsSync(path.join(uploadsDir, '.htaccess'))).toBe(false);
    });

    it('uses path.basename to prevent directory traversal in image names', async () => {
      const zip = new AdmZip();
      zip.addFile('backup.json', Buffer.from(JSON.stringify(makeBackupData())));
      // Attempt path traversal — the entry name has ../../ but basename strips it
      zip.addFile('uploads/../../evil.exe', Buffer.from('malware'));
      zip.addFile('uploads/safe.jpg', Buffer.from('ok'));
      const zipPath = path.join(tmpDir, 'traversal.zip');
      zip.writeZip(zipPath);

      await restoreBackup(zipPath);

      const uploadsDir = path.join(tmpDir, 'uploads');
      // evil.exe should be written to uploads/evil.exe (basename extracts just the filename)
      // and NOT to ../../evil.exe relative to uploads
      expect(fs.existsSync(path.join(uploadsDir, 'safe.jpg'))).toBe(true);
      // Should NOT have been written outside uploads
      expect(fs.existsSync(path.join(tmpDir, '..', 'evil.exe'))).toBe(false);
    });

    it('skips upload directory entries (only files)', async () => {
      const zip = new AdmZip();
      zip.addFile('backup.json', Buffer.from(JSON.stringify(makeBackupData())));
      // AdmZip represents directories as entries ending with /
      zip.addFile('uploads/', Buffer.alloc(0));
      zip.addFile('uploads/nested/', Buffer.alloc(0));
      zip.addFile('uploads/file.jpg', Buffer.from('data'));
      const zipPath = path.join(tmpDir, 'dirs.zip');
      zip.writeZip(zipPath);

      const result = await restoreBackup(zipPath);
      // Only the actual file should count
      expect(result.message).toContain('1 image files restored');
    });

    it('throws when backup.json is missing from ZIP', async () => {
      const zip = new AdmZip();
      zip.addFile('readme.txt', Buffer.from('oops'));
      const zipPath = path.join(tmpDir, 'nobackup.zip');
      zip.writeZip(zipPath);

      await expect(restoreBackup(zipPath)).rejects.toThrow('missing backup.json');
    });

    it('throws on invalid backup data in ZIP', async () => {
      const zipPath = createTestZip({
        backupData: { version: '2.0.0', data: { patients: 'not-array', medicalHistories: [], teeth: [], appointments: [], treatments: [], invoices: [] } },
      });

      await expect(restoreBackup(zipPath)).rejects.toThrow('Missing or invalid data for: patients');
    });

    it('throws on unsupported version in ZIP', async () => {
      const data = makeBackupData();
      data.version = '99.0.0';
      const zipPath = createTestZip({ backupData: data });

      await expect(restoreBackup(zipPath)).rejects.toThrow('Unsupported backup version: 99.0.0');
    });

    it('throws on invalid format in ZIP (no version)', async () => {
      const zipPath = createTestZip({ backupData: { data: {} } });

      await expect(restoreBackup(zipPath)).rejects.toThrow('Invalid backup file format');
    });

    it('creates audit log entry on ZIP restore', async () => {
      const zipPath = createTestZip();

      await restoreBackup(zipPath);
      expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'RESTORE',
          }),
        })
      );
    });
  });

  describe('validation of required tables', () => {
    const requiredTables = ['patients', 'medicalHistories', 'teeth', 'appointments', 'treatments', 'invoices'];

    for (const table of requiredTables) {
      it(`rejects when '${table}' is missing`, async () => {
        const data = makeBackupData();
        delete data.data[table];
        const jsonPath = createTestJson(data);

        await expect(restoreBackup(jsonPath)).rejects.toThrow(`Missing or invalid data for: ${table}`);
      });

      it(`rejects when '${table}' is not an array`, async () => {
        const data = makeBackupData({ [table]: 'not-array' });
        const jsonPath = createTestJson(data);

        await expect(restoreBackup(jsonPath)).rejects.toThrow(`Missing or invalid data for: ${table}`);
      });
    }
  });
});

// ---------------------------------------------------------------------------
// getSystemInfo
// ---------------------------------------------------------------------------

describe('getSystemInfo', () => {
  it('returns database counts and server time', async () => {
    prismaMock.user.count.mockResolvedValue(5);
    prismaMock.patient.count.mockResolvedValue(42);
    prismaMock.appointment.count.mockResolvedValue(100);
    prismaMock.treatment.count.mockResolvedValue(80);
    prismaMock.invoice.count.mockResolvedValue(30);
    prismaMock.patientImage.count.mockResolvedValue(15);
    prismaMock.auditLog.findFirst.mockResolvedValue({ createdAt: '2025-05-15T10:00:00Z' });

    const info = await getSystemInfo();

    expect(info.database.users).toBe(5);
    expect(info.database.patients).toBe(42);
    expect(info.database.appointments).toBe(100);
    expect(info.database.treatments).toBe(80);
    expect(info.database.invoices).toBe(30);
    expect(info.database.images).toBe(15);
    expect(info.lastBackup).toBe('2025-05-15T10:00:00Z');
    expect(info.serverTime).toBeTruthy();
  });

  it('returns null lastBackup when no backup exists', async () => {
    prismaMock.auditLog.findFirst.mockResolvedValue(null);

    const info = await getSystemInfo();
    expect(info.lastBackup).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Round-trip integration: createBackup → restoreBackup
// ---------------------------------------------------------------------------

describe('round-trip: create → preview → restore', () => {
  it('backup created by createBackup can be previewed and restored', async () => {
    // Set up uploads and clinic settings in tmpDir
    const uploadsDir = path.join(tmpDir, 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
    const imageContent = Buffer.from('JFIF-fake-image-content-12345');
    fs.writeFileSync(path.join(uploadsDir, 'patient-photo.jpg'), imageContent);

    const settingsPath = path.join(tmpDir, 'clinic-settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(CLINIC_SETTINGS));

    // Create backup
    const savePath = path.join(tmpDir, 'roundtrip.zip');
    (mockElectron.dialog.showSaveDialog as any).mockResolvedValue({ canceled: false, filePath: savePath });

    await createBackup();
    expect(fs.existsSync(savePath)).toBe(true);

    // Clean up the user data so we can verify restore recreates it
    fs.rmSync(uploadsDir, { recursive: true });
    fs.rmSync(settingsPath);

    // Preview
    const preview = await previewBackup(savePath);
    expect(preview.version).toBe('2.0.0');
    expect(preview.hasImages).toBe(true);
    expect(preview.imageCount).toBe(1);
    expect(preview.hasClinicSettings).toBe(true);

    // Restore
    const result = await restoreBackup(savePath);
    expect(result.message).toContain('image files restored');
    expect(result.message).toContain('clinic settings restored');

    // Verify files were restored
    expect(fs.existsSync(path.join(uploadsDir, 'patient-photo.jpg'))).toBe(true);
    expect(fs.readFileSync(path.join(uploadsDir, 'patient-photo.jpg'))).toEqual(imageContent);
    expect(fs.existsSync(settingsPath)).toBe(true);
    const restoredSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    expect(restoredSettings.name).toBe('Test Dental Clinic');
  });
});
