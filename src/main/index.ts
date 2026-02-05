import { app, BrowserWindow, protocol, net } from 'electron';
import path from 'path';
import fs from 'fs';
import { initDatabase } from './server/app';
import { registerAllHandlers } from './ipc/handlers';

let mainWindow: BrowserWindow | null = null;

function registerLocalImageProtocol() {
  protocol.handle('local-image', (request) => {
    const storedName = decodeURIComponent(request.url.replace('local-image://', ''));
    // Path traversal protection: only use the basename
    const safeName = path.basename(storedName);
    const uploadsDir = path.join(app.getPath('userData'), 'uploads');
    const filePath = path.join(uploadsDir, safeName);

    if (!fs.existsSync(filePath)) {
      return new Response('Not found', { status: 404 });
    }

    return net.fetch(`file://${filePath}`);
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Dental Clinic Management System',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  const rendererPath = path.join(__dirname, '../renderer/index.html');
  mainWindow.loadFile(rendererPath);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await initDatabase();
    registerLocalImageProtocol();
    registerAllHandlers();

    await createWindow();
  } catch (error) {
    console.error('Failed to start application:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
