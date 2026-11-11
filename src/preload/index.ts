import { contextBridge, ipcRenderer } from 'electron';
import { IPC, type PortLensApi } from '../shared/ipc.js';

const api: PortLensApi = {
  getSnapshot: () => ipcRenderer.invoke(IPC.snapshot),
  getSettings: () => ipcRenderer.invoke(IPC.settingsGet),
  saveSettings: (settings) => ipcRenderer.invoke(IPC.settingsSave, settings),
  prepareStop: (request) => ipcRenderer.invoke(IPC.stopPrepare, request),
  executeStop: (request) => ipcRenderer.invoke(IPC.stopExecute, request),
  subscribeStopProgress(listener) {
    const wrapped = (_event: Electron.IpcRendererEvent, progress: Parameters<typeof listener>[0]) => listener(progress);
    ipcRenderer.on(IPC.stopProgress, wrapped);
    return () => ipcRenderer.removeListener(IPC.stopProgress, wrapped);
  }
};
contextBridge.exposeInMainWorld('portLens', api);
