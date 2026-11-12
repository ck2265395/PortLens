import type { PortRecord } from './ports.js';
export type SnapshotDiff = { added: PortRecord[]; removed: PortRecord[]; changed: { before: PortRecord; after: PortRecord }[] };
export function diffSnapshots(previous: PortRecord[], next: PortRecord[]): SnapshotDiff {
  const a = new Map(previous.map((r) => [r.key, r])); const b = new Map(next.map((r) => [r.key, r]));
  return {
    added: next.filter((r) => !a.has(r.key)), removed: previous.filter((r) => !b.has(r.key)),
    changed: next.flatMap((r) => { const before = a.get(r.key); return before && JSON.stringify(before) !== JSON.stringify(r) ? [{ before, after: r }] : []; })
  };
}
