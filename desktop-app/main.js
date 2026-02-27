const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

//const DESKTOP_URL = process.env.DESKTOP_APP_URL || 'http://localhost:3000';
const DESKTOP_URL = process.env.DESKTOP_APP_URL || 'https://vis-management-app.fly.dev';
const ICON_PNG = path.join(__dirname, 'assets', 'icon.png');
const DESKTOP_PROTOCOL = 'insaidem';
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}

app.setName('INSAIDEM');
if (!app.isDefaultProtocolClient(DESKTOP_PROTOCOL)) {
  app.setAsDefaultProtocolClient(DESKTOP_PROTOCOL);
}

function ensureDesktopPath(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (!parsed.pathname || parsed.pathname === '/') {
      parsed.pathname = '/desktop';
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function apiBaseFromDesktopUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.origin}/api`;
  } catch {
    return 'https://monday-clone-mvp.fly.dev/api';
  }
}

// Backend API lives on a different Fly app in production.
const API_URL = process.env.DESKTOP_API_URL || process.env.DESKTOP_API_BASE_URL || 'https://monday-clone-mvp.fly.dev/api';
let mainWindow = null;
let pendingAuthCode = null;

function getDeepLinkCode(inputUrl) {
  try {
    const parsed = new URL(inputUrl);
    if (parsed.protocol !== `${DESKTOP_PROTOCOL}:`) return null;
    return parsed.searchParams.get('code');
  } catch {
    return null;
  }
}

async function exchangeDesktopCode(code) {
  const response = await fetch(`${API_URL}/auth/desktop/exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code })
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Desktop exchange failed (${response.status}): ${payload}`);
  }

  return response.json();
}

async function applyTokenToRenderer(token) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const authBridgeUrl = new URL('/desktop-auth', DESKTOP_URL);
  authBridgeUrl.searchParams.set('token', token);
  await mainWindow.loadURL(authBridgeUrl.toString());
}

async function handleDesktopAuthCode(code) {
  if (!code) return;
  try {
    const data = await exchangeDesktopCode(code);
    await applyTokenToRenderer(data.token);
  } catch (error) {
    console.error('Desktop auth callback error:', error);
  }
}

function extractDeepLinkFromArgv(argv) {
  return argv.find((arg) => arg.startsWith(`${DESKTOP_PROTOCOL}://`)) || null;
}

function queueCodeFromUrl(inputUrl) {
  const code = getDeepLinkCode(inputUrl);
  if (!code) return;
  if (mainWindow) {
    handleDesktopAuthCode(code);
  } else {
    pendingAuthCode = code;
  }
}

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
    ...(process.platform !== 'darwin' ? { icon: ICON_PNG } : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: 'persist:insaidem-desktop'
    }
  });

  mainWindow = win;
  win.loadURL(ensureDesktopPath(DESKTOP_URL));

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(ICON_PNG);
  }

  // Windows/Linux deep links can arrive in argv on first launch.
  const startupDeepLink = extractDeepLinkFromArgv(process.argv);
  if (startupDeepLink) {
    queueCodeFromUrl(startupDeepLink);
  }

  createWindow();
  if (pendingAuthCode) {
    handleDesktopAuthCode(pendingAuthCode);
    pendingAuthCode = null;
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('open-url', (event, url) => {
  event.preventDefault();
  queueCodeFromUrl(url);
});

if (gotTheLock) {
  app.on('second-instance', (_event, commandLine) => {
    const deeplinkArg = extractDeepLinkFromArgv(commandLine);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      if (deeplinkArg) {
        queueCodeFromUrl(deeplinkArg);
      }
    } else if (deeplinkArg) {
      queueCodeFromUrl(deeplinkArg);
    }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
