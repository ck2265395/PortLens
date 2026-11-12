import { app, dialog, Menu, nativeImage, Tray } from 'electron';
import { createMainWindow } from './window.js';
import { registerIpc } from './ipc/registerIpc.js';
import { SettingsStore } from './settings/SettingsStore.js';
import { E2EFixtureProvider } from './system/E2EFixtureProvider.js';

let tray: Tray | undefined;
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  const settings = new SettingsStore(); const window = createMainWindow(); const provider = !app.isPackaged && process.env.PORTLENS_E2E_FIXTURE === '1' ? new E2EFixtureProvider() : undefined; const operations = registerIpc(settings, window.webContents.id, provider); let allowClose = false; let exitTimer: ReturnType<typeof setInterval> | undefined;
  window.on('minimize', () => { if (!settings.get().minimizeToTray) return; window.hide(); if (!tray) { const icon = nativeImage.createFromDataURL('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiI+PHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iNCIgZmlsbD0iIzI1NjNlYiIvPjxwYXRoIGQ9Ik00IDN2MTBoMlY5aDNjMiAwIDMtMSAzLTNzLTEtMy0zLTNINHptMiAyaDNjLjcgMCAxIC4zIDEgMXMtLjMgMS0xIDFINlY1eiIgZmlsbD0id2hpdGUiLz48L3N2Zz4='); tray = new Tray(icon); tray.setToolTip('PortLens'); tray.setContextMenu(Menu.buildFromTemplate([{ label: '打开 PortLens', click: () => window.show() }, { type: 'separator' }, { label: '退出', click: () => window.close() }])); tray.on('double-click', () => window.show()); } });
  window.on('close', (event) => { if (allowClose || !operations.isStopping()) return; event.preventDefault(); const choice = dialog.showMessageBoxSync(window, { type: 'warning', title: '操作仍在进行', message: 'PortLens 正在停止进程或服务', detail: '立即退出可能无法确认最终状态。', buttons: ['继续等待并退出', '取消退出'], defaultId: 1, cancelId: 1 }); if (exitTimer) { clearInterval(exitTimer); exitTimer = undefined; } if (choice === 0) { exitTimer = setInterval(() => { if (!operations.isStopping()) { clearInterval(exitTimer); exitTimer = undefined; allowClose = true; window.close(); } }, 250); } });
});
app.on('window-all-closed', () => app.quit());
