import type { AppSettings } from './settings.js';
import type { PortSnapshot, StopProgress, StopRequest, StopResult } from './ports.js';
import type { AuditEntry } from './audit.js';

export const IPC = {
  snapshot: 'ports:snapshot', settingsGet: 'settings:get', settingsSave: 'settings:save',
  stopPrepare: 'stop:prepare', stopExecute: 'stop:execute', stopForce: 'stop:force', stopProgress: 'stop:progress',
  logsGet: 'logs:get', logsClear: 'logs:clear', logsExport: 'logs:export', elevationRequest: 'elevation:request'
} as const;

export interface PortLensApi {
  getSnapshot(): Promise<PortSnapshot>;
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<AppSettings>;
  prepareStop(request: StopRequest): Promise<StopResult>;
  executeStop(request: StopRequest): Promise<StopResult>;
  confirmForceStop(key: string): Promise<StopResult>;
  getLogs(): Promise<AuditEntry[]>;
  clearLogs(): Promise<void>;
  exportLogs(format: 'json' | 'csv'): Promise<boolean>;
  requestElevation(): Promise<boolean>;
  subscribeStopProgress(listener: (progress: StopProgress) => void): () => void;
}
