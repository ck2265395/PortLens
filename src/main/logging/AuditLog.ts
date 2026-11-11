import { randomUUID } from 'node:crypto';
import Store from 'electron-store';
import type { AuditEntry, NewAuditEntry } from '../../shared/audit.js';
type StoreLike = Pick<Store<{ entries: AuditEntry[] }>, 'get' | 'set'>;
const csv = (value: unknown) => { const text = String(value ?? ''); return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; };
export class AuditLog {
  private readonly store: StoreLike;
  constructor(store?: StoreLike, private readonly now = () => new Date()) { this.store = store ?? new Store<{ entries: AuditEntry[] }>({ name: 'audit-log', defaults: { entries: [] } }); }
  list(): AuditEntry[] { const cutoff = this.now().getTime() - 7 * 86400_000; const entries = (this.store.get('entries', []) as AuditEntry[]).filter((entry) => new Date(entry.timestamp).getTime() >= cutoff); this.store.set('entries', entries); return entries; }
  append(entry: NewAuditEntry): AuditEntry { const value = { ...entry, id: randomUUID(), timestamp: this.now().toISOString() }; this.store.set('entries', [...this.list(), value]); return value; }
  clear(): void { this.store.set('entries', []); }
  toJson(): string { return JSON.stringify(this.list(), null, 2); }
  toCsv(): string { const fields: (keyof AuditEntry)[] = ['timestamp','action','port','protocol','pid','processName','serviceName','method','privilege','result','message']; return [fields.join(','), ...this.list().map((entry) => fields.map((field) => csv(entry[field])).join(','))].join('\r\n'); }
}
