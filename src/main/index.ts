import { app, BrowserWindow, protocol, net, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { autoUpdater } from 'electron-updater';
import { initDatabase } from './server/app';
import { registerAllHandlers } from './ipc/handlers';
import { prisma } from './server/utils/prisma';

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
    icon: path.join(__dirname, '..', 'renderer', 'icon.png'),
    title: 'Dental Clinic Management System',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools();
  } else {
    const rendererPath = path.join(__dirname, '../renderer/index.html');
    mainWindow.loadFile(rendererPath);
  }

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

    // Setup auto-updater after window is created
    setupAutoUpdater();
  } catch (error) {
    console.error('Failed to start application:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('will-quit', async () => {
  await prisma.$disconnect();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Auto-updater configuration
function setupAutoUpdater() {
  // Don't check for updates in development
  if (process.env.VITE_DEV_SERVER_URL) {
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available and will be downloaded in the background.`,
      buttons: ['OK'],
    });
  });

  autoUpdater.on('update-not-available', () => {
    console.log('No updates available');
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`Download progress: ${progress.percent.toFixed(1)}%`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version);
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded. The app will restart to install the update.`,
      buttons: ['Restart Now', 'Later'],
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on('error', (error) => {
    console.error('Auto-updater error:', error);
  });

  // Check for updates after app is ready
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    console.error('Failed to check for updates:', err);
  });

  // Check for updates every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error('Periodic update check failed:', err);
    });
  }, 4 * 60 * 60 * 1000);
}
