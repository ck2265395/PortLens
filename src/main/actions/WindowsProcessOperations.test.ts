import { beforeEach, describe, expect, it, vi } from 'vitest';

const runPowerShell = vi.fn(async (_script: string, _args?: readonly string[]) => ({ stdout: 'false', stderr: '' }));
vi.mock('../system/powershellRunner.js', () => ({ runPowerShell }));

describe('WindowsProcessOperations', () => {
  beforeEach(() => runPowerShell.mockClear());

  it('passes valid service names containing dollar signs and spaces as escaped data', async () => {
    const { WindowsProcessOperations } = await import('./WindowsProcessOperations.js');
    const operations = new WindowsProcessOperations();
    await operations.stopService('MSSQL$SQLEXPRESS Test');
    expect(runPowerShell).toHaveBeenCalledWith('-Command', [expect.stringContaining("'MSSQL$SQLEXPRESS Test'")]);
  });

  it('verifies identity and closes the same PowerShell process object', async () => {
    const { WindowsProcessOperations } = await import('./WindowsProcessOperations.js');
    const operations = new WindowsProcessOperations();
    await operations.graceful({ pid: 42, processName: 'node.exe', processPath: "C:/O'Brien/node.exe", startedAt: '2026-11-11T00:00:00.000Z', isCritical: false });
    const command = runPowerShell.mock.calls[0]![1]![0]!;
    expect(command).toContain("$p=Get-Process -Id 42");
    expect(command).toContain("C:/O''Brien/node.exe");
    expect(command).toContain('$p.CloseMainWindow()');
  });
});
