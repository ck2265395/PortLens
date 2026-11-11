import { BrowserWindow } from 'electron';
import { join } from 'node:path';

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1180, height: 760, minWidth: 820, minHeight: 560,
    title: 'PortLens', backgroundColor: '#0b1020',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: join(import.meta.dirname, '../preload/index.js') }
  });
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) void window.loadURL(devUrl);
  else void window.loadFile(join(import.meta.dirname, '../renderer/index.html'));
  return window;
}
