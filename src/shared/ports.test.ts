import { describe, expect, it } from 'vitest';
import { portRecordSchema } from './ports.js';

describe('portRecordSchema', () => {
  const base = { key: 'tcp|127.0.0.1|3000|42', protocol: 'TCP', localAddress: '127.0.0.1', localPort: 3000, pid: 42, processName: 'node.exe', processPath: 'C:/node.exe', commandLine: 'node app.js', user: 'dev', startedAt: '2026-11-11T09:00:00.000Z', services: [], state: 'LISTENING', isElevated: false, isCritical: false };
  it('accepts a TCP listener', () => expect(portRecordSchema.parse(base).state).toBe('LISTENING'));
  it('rejects LISTENING for UDP', () => expect(() => portRecordSchema.parse({ ...base, protocol: 'UDP' })).toThrow());
  it('rejects invalid port numbers', () => expect(() => portRecordSchema.parse({ ...base, localPort: 70000 })).toThrow());
});
