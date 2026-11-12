import { execFile } from 'node:child_process';

export type PowerShellRun = (scriptPath: string, args?: readonly string[], options?: { timeoutMs?: number; signal?: AbortSignal }) => Promise<{ stdout: string; stderr: string }>;

export const runPowerShell: PowerShellRun = (scriptPath, args = [], options = {}) => new Promise((resolve, reject) => {
  const invocation = scriptPath === '-Command' ? ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', ...args] : ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...args];
  execFile('powershell.exe', invocation,
    { timeout: options.timeoutMs ?? 12_000, windowsHide: true, encoding: 'utf8', signal: options.signal },
    (error, stdout, stderr) => error ? reject(error) : resolve({ stdout, stderr }));
});
