export type AuditEntry = { id: string; timestamp: string; action: 'stop' | 'force-stop'; pid: number; processName: string; port: number; protocol: 'TCP' | 'UDP'; serviceName: string; method: 'service' | 'graceful' | 'force'; privilege: 'standard' | 'administrator'; result: string; message: string };
export type NewAuditEntry = Omit<AuditEntry, 'id' | 'timestamp'>;
