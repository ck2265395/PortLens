import { describe, expect, it } from 'vitest';
import { PowerShellPortProvider, resolvePowerShellScriptPath } from './PowerShellPortProvider.js';

describe('PowerShellPortProvider', () => {
  it('resolves packaged scripts from app.asar.unpacked', () => {
    expect(resolvePowerShellScriptPath('C:/app/resources/app.asar/dist/main/system')).toContain('app.asar.unpacked');
  });
  it('normalizes TCP and UDP records', async () => {
    const run = async () => ({ stdout: JSON.stringify([
      { protocol: 'TCP', localAddress: '0.0.0.0', localPort: 3000, pid: 42, processName: 'node.exe', processPath: 'C:/node.exe', commandLine: 'node app', user: 'dev', startedAt: '2026-11-11T00:00:00Z', services: [], isElevated: false, isCritical: false },
      { protocol: 'UDP', localAddress: '127.0.0.1', localPort: 5353, pid: 12, processName: 'dns.exe', processPath: '', commandLine: '', user: '', startedAt: '', services: [], isElevated: false, isCritical: false }
    ]), stderr: '' });
    const snapshot = await new PowerShellPortProvider(run).getSnapshot();
    expect(snapshot.records.map((r) => [r.key, r.state])).toEqual([
      ['TCP|0.0.0.0|3000|42', 'LISTENING'], ['UDP|127.0.0.1|5353|12', 'BOUND']
    ]);
  });

  it('returns a typed error for invalid JSON', async () => {
    const provider = new PowerShellPortProvider(async () => ({ stdout: 'oops', stderr: '' }));
    await expect(provider.getSnapshot()).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
  });
  it('rejects empty output instead of clearing the last good snapshot', async () => {
    const provider = new PowerShellPortProvider(async () => ({ stdout: '', stderr: '' }));
    await expect(provider.getSnapshot()).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
  });
  it('rejects JSON null as invalid output', async () => {
    const provider = new PowerShellPortProvider(async () => ({ stdout: 'null', stderr: '' }));
    await expect(provider.getSnapshot()).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
  });

  it('normalizes a single PowerShell service object to an array', async () => {
    const run = async () => ({ stdout: JSON.stringify({ protocol: 'TCP', localAddress: '0.0.0.0', localPort: 80, pid: 8, processName: 'svc.exe', processPath: '', commandLine: '', user: '', startedAt: '', services: { name: 'svc', displayName: 'Service', status: 'Running', canStop: true }, isElevated: false, isCritical: false }), stderr: '' });
    const result = await new PowerShellPortProvider(run).getSnapshot();
    expect(result.records[0].services).toEqual([{ name: 'svc', displayName: 'Service', status: 'Running', canStop: true }]);
  });
});
