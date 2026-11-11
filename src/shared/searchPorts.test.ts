import { expect, it } from 'vitest';
import { searchPorts } from './searchPorts.js';
import type { PortRecord } from './ports.js';

const rows = [
  { key: 'a', protocol: 'TCP', localAddress: '127.0.0.1', localPort: 3000, pid: 42, processName: 'node.exe', processPath: 'C:/node.exe', commandLine: 'node server.js', user: 'dev', startedAt: '', services: [], state: 'LISTENING', isElevated: false, isCritical: false },
  { key: 'b', protocol: 'UDP', localAddress: '0.0.0.0', localPort: 5353, pid: 7, processName: 'mDNS.exe', processPath: '', commandLine: '', user: 'SYSTEM', startedAt: '', services: [], state: 'BOUND', isElevated: true, isCritical: false }
] as PortRecord[];

it('matches multiple terms with AND semantics', () => expect(searchPorts(rows, 'node 3000', {})).toEqual([rows[0]]));
it('matches case-insensitively and filters protocol', () => expect(searchPorts(rows, 'mdns', { protocol: 'UDP' })).toEqual([rows[1]]));
