import { join } from 'node:path';
import { portSnapshotSchema, type PortRecord, type PortSnapshot } from '../../shared/ports.js';
import type { SystemPortProvider } from './SystemPortProvider.js';
import { runPowerShell, type PowerShellRun } from './powershellRunner.js';

export class PortProviderError extends Error { constructor(public code: 'INVALID_OUTPUT' | 'QUERY_FAILED', message: string, options?: ErrorOptions) { super(message, options); } }
export const resolvePowerShellScriptPath = (directory: string) => join(directory.includes('app.asar') ? directory.replace('app.asar', 'app.asar.unpacked') : directory, 'scripts/get-port-snapshot.ps1');

export class PowerShellPortProvider implements SystemPortProvider {
  constructor(private readonly run: PowerShellRun = runPowerShell) {}
  async getSnapshot(signal?: AbortSignal): Promise<PortSnapshot> {
    try {
      const result = await this.run(resolvePowerShellScriptPath(import.meta.dirname), [], { timeoutMs: 30_000, signal });
      if (!result.stdout.trim()) throw new PortProviderError('INVALID_OUTPUT', 'PowerShell returned no port data');
      const parsed: unknown = JSON.parse(result.stdout);
      if (parsed === null) throw new PortProviderError('INVALID_OUTPUT', 'PowerShell returned null port data');
      const values = Array.isArray(parsed) ? parsed : [parsed];
      const records = values.filter(Boolean).map((raw: any): PortRecord => {
        const protocol = String(raw.protocol).toUpperCase() as 'TCP' | 'UDP';
        const localAddress = String(raw.localAddress || '0.0.0.0');
        const localPort = Number(raw.localPort);
        const pid = Number(raw.pid);
        const services = Array.isArray(raw.services) ? raw.services : raw.services && Object.keys(raw.services).length ? [raw.services] : [];
        return { ...raw, protocol, localAddress, localPort, pid, key: `${protocol}|${localAddress}|${localPort}|${pid}`, state: protocol === 'TCP' ? 'LISTENING' : 'BOUND', services, isElevated: Boolean(raw.isElevated), isCritical: Boolean(raw.isCritical), processName: String(raw.processName ?? ''), processPath: String(raw.processPath ?? ''), commandLine: String(raw.commandLine ?? ''), user: String(raw.user ?? ''), startedAt: String(raw.startedAt ?? '') };
      });
      return portSnapshotSchema.parse({ capturedAt: new Date().toISOString(), records });
    } catch (error) {
      if (error instanceof PortProviderError) throw error;
      if (error instanceof SyntaxError || (error && typeof error === 'object' && 'issues' in error)) throw new PortProviderError('INVALID_OUTPUT', 'PowerShell returned invalid port data', { cause: error });
      throw new PortProviderError('QUERY_FAILED', 'Unable to query Windows ports', { cause: error });
    }
  }
}
