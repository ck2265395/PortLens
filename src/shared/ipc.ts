import type { AppSettings } from './settings.js';
import type { PortSnapshot, StopProgress, StopRequest, StopResult } from './ports.js';

export const IPC = {
  snapshot: 'ports:snapshot', settingsGet: 'settings:get', settingsSave: 'settings:save',
  stopPrepare: 'stop:prepare', stopExecute: 'stop:execute', stopProgress: 'stop:progress'
} as const;

export interface PortLensApi {
  getSnapshot(): Promise<PortSnapshot>;
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<AppSettings>;
  prepareStop(request: StopRequest): Promise<StopResult>;
  executeStop(request: StopRequest): Promise<StopResult>;
  subscribeStopProgress(listener: (progress: StopProgress) => void): () => void;
}
