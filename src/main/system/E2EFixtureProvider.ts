import type { SystemPortProvider } from './SystemPortProvider.js';
import type { PortRecord, PortSnapshot } from '../../shared/ports.js';

const base: Pick<PortRecord, 'processName' | 'processPath' | 'commandLine' | 'user' | 'startedAt' | 'services' | 'isElevated' | 'isCritical'> = { processName: 'node.exe', processPath: 'C:/tools/node.exe', commandLine: 'node server.js --environment test', user: 'PORTLENS\\operator', startedAt: '2026-11-11T00:00:00.000Z', services: [], isElevated: false, isCritical: false };

export class E2EFixtureProvider implements SystemPortProvider {
  async getSnapshot(): Promise<PortSnapshot> {
    return { capturedAt: new Date().toISOString(), records: [
      { ...base, key: 'TCP|127.0.0.1|3000|4242', protocol: 'TCP', localAddress: '127.0.0.1', localPort: 3000, pid: 4242, state: 'LISTENING' },
      { ...base, key: 'TCP|127.0.0.1|3001|4242', protocol: 'TCP', localAddress: '127.0.0.1', localPort: 3001, pid: 4242, state: 'LISTENING' },
      { ...base, key: 'UDP|0.0.0.0|5353|5353', protocol: 'UDP', localAddress: '0.0.0.0', localPort: 5353, pid: 5353, processName: 'dns-helper.exe', processPath: 'C:/tools/dns-helper.exe', commandLine: 'dns-helper --local', state: 'BOUND' }
    ] };
  }
}
