import { BrowserWindow } from 'electron';
import { join } from 'node:path';

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1180, height: 760, minWidth: 820, minHeight: 560,
    title: 'PortLens', backgroundColor: '#0b1020',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: join(import.meta.dirname, '../preload/index.cjs') }
  });
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => { if (!url.startsWith('file:') && (!devUrl || !url.startsWith(devUrl))) event.preventDefault(); });
  if (devUrl) void window.loadURL(devUrl);
  else void window.loadFile(join(import.meta.dirname, '../renderer/index.html'));
  return window;
}
