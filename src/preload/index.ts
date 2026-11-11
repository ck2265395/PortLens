import { contextBridge, ipcRenderer } from 'electron';
import { IPC, type PortLensApi } from '../shared/ipc.js';

const api: PortLensApi = {
  getSnapshot: () => ipcRenderer.invoke(IPC.snapshot),
  getSettings: () => ipcRenderer.invoke(IPC.settingsGet),
  saveSettings: (settings) => ipcRenderer.invoke(IPC.settingsSave, settings),
  prepareStop: (request) => ipcRenderer.invoke(IPC.stopPrepare, request),
  executeStop: (request) => ipcRenderer.invoke(IPC.stopExecute, request),
  confirmForceStop: (key) => ipcRenderer.invoke(IPC.stopForce, key),
  getLogs: () => ipcRenderer.invoke(IPC.logsGet),
  clearLogs: () => ipcRenderer.invoke(IPC.logsClear),
  exportLogs: (format) => ipcRenderer.invoke(IPC.logsExport, format),
  requestElevation: () => ipcRenderer.invoke(IPC.elevationRequest),
  subscribeStopProgress(listener) {
    const wrapped = (_event: Electron.IpcRendererEvent, progress: Parameters<typeof listener>[0]) => listener(progress);
    ipcRenderer.on(IPC.stopProgress, wrapped);
    return () => ipcRenderer.removeListener(IPC.stopProgress, wrapped);
  }
};
contextBridge.exposeInMainWorld('portLens', api);
