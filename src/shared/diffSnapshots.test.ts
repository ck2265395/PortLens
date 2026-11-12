import { expect, it } from 'vitest';
import { diffSnapshots } from './diffSnapshots.js';
import type { PortRecord } from './ports.js';

const record = (pid: number, name = 'node.exe'): PortRecord => ({ key: `TCP|127.0.0.1|3000|${pid}`, protocol: 'TCP', localAddress: '127.0.0.1', localPort: 3000, pid, processName: name, processPath: '', commandLine: '', user: '', startedAt: '', services: [], state: 'LISTENING', isElevated: false, isCritical: false });

it('treats a reused port with a new PID as remove plus add', () => {
  const result = diffSnapshots([record(1)], [record(2)]);
  expect(result.removed.map((r) => r.pid)).toEqual([1]);
  expect(result.added.map((r) => r.pid)).toEqual([2]);
});

it('reports changed records without losing identity', () => {
  const result = diffSnapshots([record(1)], [record(1, 'node-new.exe')]);
  expect(result.changed).toHaveLength(1);
});
