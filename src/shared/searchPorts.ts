import type { PortRecord } from './ports.js';
export type PortFilters = { protocol?: 'TCP' | 'UDP'; address?: 'all' | 'local' | 'public' };
export function searchPorts(records: PortRecord[], query: string, filters: PortFilters): PortRecord[] {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return records.filter((r) => {
    if (filters.protocol && r.protocol !== filters.protocol) return false;
    if (filters.address === 'local' && !['127.0.0.1', '::1'].includes(r.localAddress)) return false;
    if (filters.address === 'public' && ['127.0.0.1', '::1'].includes(r.localAddress)) return false;
    const text = [r.localPort, r.pid, r.protocol, r.localAddress, r.processName, r.processPath, r.commandLine, r.user, ...r.services.flatMap((s) => [s.name, s.displayName])].join(' ').toLocaleLowerCase();
    return terms.every((term) => text.includes(term));
  }).sort((x, y) => x.localPort - y.localPort || x.protocol.localeCompare(y.protocol));
}
