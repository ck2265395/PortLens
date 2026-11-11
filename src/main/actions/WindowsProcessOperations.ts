import { runPowerShell } from '../system/powershellRunner.js';
import type { ProcessIdentity } from '../../shared/ports.js';

export class WindowsProcessOperations {
  private psLiteral(value: string): string { if (/[\0\r\n]/.test(value)) throw new Error('Invalid Windows value'); return `'${value.replaceAll("'", "''")}'`; }
  private identityGuard(identity: ProcessIdentity): string { return `$p=Get-Process -Id ${identity.pid} -ErrorAction SilentlyContinue;if(-not $p){throw 'process ended'};$path=try{$p.Path}catch{''};$started=try{$p.StartTime.ToUniversalTime().ToString('o')}catch{''};if(($path -ne ${this.psLiteral(identity.processPath)}) -or ($started -ne ${this.psLiteral(identity.startedAt)})){throw 'process identity changed'}`; }
  async inspect(pid: number): Promise<ProcessIdentity | null> {
    const command = `$p=Get-Process -Id ${pid} -ErrorAction SilentlyContinue;if($p){$n=$p.Name+'.exe';@{pid=$p.Id;processName=$n;processPath=try{$p.Path}catch{''};startedAt=try{$p.StartTime.ToUniversalTime().ToString('o')}catch{''};isCritical=(($p.Id -in @(0,4)) -or ($n -in @('smss.exe','csrss.exe','wininit.exe','winlogon.exe','lsass.exe')))}|ConvertTo-Json -Compress}`;
    const { stdout } = await runPowerShell('-Command', [command]);
    if (!stdout.trim()) return null;
    return JSON.parse(stdout) as ProcessIdentity;
  }
  async stopService(name: string): Promise<void> { await runPowerShell('-Command', [`Stop-Service -Name ${this.psLiteral(name)} -ErrorAction Stop`]); }
  async inspectService(name: string): Promise<{ pid: number; canStop: boolean; status: string } | null> { const { stdout } = await runPowerShell('-Command', [`$s=Get-CimInstance Win32_Service -ErrorAction Stop | Where-Object Name -eq ${this.psLiteral(name)} | Select-Object -First 1;if($s){@{pid=[int]$s.ProcessId;canStop=[bool]$s.AcceptStop;status=[string]$s.State}|ConvertTo-Json -Compress}`]); return stdout.trim() ? JSON.parse(stdout) as { pid: number; canStop: boolean; status: string } : null; }
  async isServiceRunning(name: string): Promise<boolean> { const { stdout } = await runPowerShell('-Command', [`(Get-Service -Name ${this.psLiteral(name)} -ErrorAction SilentlyContinue).Status -eq 'Running'`]); return stdout.trim().toLowerCase() === 'true'; }
  async graceful(identity: ProcessIdentity): Promise<boolean> {
    const command = `${this.identityGuard(identity)};$p.CloseMainWindow().ToString().ToLowerInvariant()`;
    const { stdout } = await runPowerShell('-Command', [command]); return stdout.trim().toLowerCase() === 'true';
  }
  async force(identity: ProcessIdentity): Promise<void> { await runPowerShell('-Command', [`${this.identityGuard(identity)};$p | Stop-Process -Force -ErrorAction Stop`]); }
  async exists(pid: number): Promise<boolean> { const { stdout } = await runPowerShell('-Command', [`[bool](Get-Process -Id ${pid} -ErrorAction SilentlyContinue)`]); return stdout.trim().toLowerCase() === 'true'; }
}
