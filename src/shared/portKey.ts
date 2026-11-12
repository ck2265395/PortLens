import type { PortRecord } from './ports.js';
export const portKey = (record: Pick<PortRecord, 'protocol' | 'localAddress' | 'localPort' | 'pid'>) => `${record.protocol}|${record.localAddress}|${record.localPort}|${record.pid}`;
