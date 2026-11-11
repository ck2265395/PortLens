import { expect, it } from 'vitest';
import { AuditLog } from './AuditLog.js';

it('prunes entries older than seven days', () => {
  const data = [{ id: 'old', timestamp: '2026-11-01T00:00:00Z', action: 'stop', pid: 1, processName: 'x', port: 1, protocol: 'TCP', serviceName: '', method: 'graceful', privilege: 'standard', result: 'stopped', message: '' }];
  const store = { get: () => data, set: (_key: string, value: unknown) => { data.splice(0, data.length, ...(value as typeof data)); } };
  const log = new AuditLog(store as any, () => new Date('2026-11-11T00:00:00Z'));
  expect(log.list()).toEqual([]);
});

it('exports CSV with escaped fields', () => {
  const data: any[] = []; const store = { get: () => data, set: (_key: string, value: unknown) => { data.splice(0, data.length, ...(value as any[])); } };
  const log = new AuditLog(store as any, () => new Date('2026-11-11T00:00:00Z'));
  log.append({ action: 'stop', pid: 42, processName: 'a,b.exe', port: 3000, protocol: 'TCP', serviceName: '', method: 'graceful', privilege: 'standard', result: 'stopped', message: 'ok' });
  expect(log.toCsv()).toContain('"a,b.exe"');
});

it('exports service, execution method, and privilege context in JSON and CSV', () => {
  const data: any[] = []; const store = { get: () => data, set: (_key: string, value: unknown) => { data.splice(0, data.length, ...(value as any[])); } };
  const log = new AuditLog(store as any, () => new Date('2026-11-11T00:00:00Z'));
  log.append({ action: 'stop', pid: 42, processName: 'sqlservr.exe', port: 1433, protocol: 'TCP', serviceName: 'MSSQL$SQLEXPRESS', method: 'service', privilege: 'administrator', result: 'stopped', message: 'ok' } as any);
  expect(log.toCsv()).toContain('serviceName,method,privilege');
  expect(log.toJson()).toContain('MSSQL$SQLEXPRESS');
  log.clear();
  expect(log.list()).toEqual([]);
});
