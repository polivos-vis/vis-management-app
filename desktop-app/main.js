const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const DESKTOP_URL = process.env.DESKTOP_APP_URL || 'http://localhost:3000/desktop';

function createWindow() {
  const win = new BrowserWindow({
    width: 980,
    height: 700,
    minWidth: 420,
    minHeight: 320,
    backgroundColor: '#ffffff',
    title: 'INSAIDEM Tasks',
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    ...(process.platform === 'darwin' ? { trafficLightPosition: { x: 14, y: 12 } } : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: 'persist:insaidem-desktop'
    }
  });

  win.loadURL(DESKTOP_URL);

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
