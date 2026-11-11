import { app, dialog, ipcMain } from 'electron';
import { writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { IPC } from '../../shared/ipc.js';
import { appSettingsSchema } from '../../shared/settings.js';
import { stopRequestSchema, type ProcessIdentity, type StopRequest, type StopResult } from '../../shared/ports.js';
import { PowerShellPortProvider } from '../system/PowerShellPortProvider.js';
import type { SystemPortProvider } from '../system/SystemPortProvider.js';
import { SettingsStore } from '../settings/SettingsStore.js';
import { evaluateTarget } from '../actions/targetPolicy.js';
import { StopService, type StopPlan } from '../actions/StopService.js';
import { WindowsProcessOperations } from '../actions/WindowsProcessOperations.js';
import { AuditLog } from '../logging/AuditLog.js';

export function registerIpc(settings = new SettingsStore(), authorizedSenderId?: number, provider: SystemPortProvider = new PowerShellPortProvider()): { isStopping: () => boolean } {
  let activeStops = 0;
  const selfTree = new Set([process.pid]); const stopService = new StopService(new WindowsProcessOperations(), selfTree);
  const prepared = new Map<string, { plan: StopPlan; canForce: boolean }>();
  const audit = new AuditLog();
  const isAdministrator = (() => { try { const output = execFileSync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', "([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)"], { windowsHide: true, encoding: 'utf8' }); return output.trim().toLowerCase() === 'true'; } catch { return false; } })();
  const handle = (channel: string, listener: (...args: any[]) => unknown) => ipcMain.handle(channel, (event, ...args) => {
    if ((authorizedSenderId !== undefined && event.sender.id !== authorizedSenderId) || event.senderFrame !== event.sender.mainFrame) throw new Error('Unauthorized IPC sender');
    return listener(...args);
  });
  handle(IPC.snapshot, () => provider.getSnapshot());
  handle(IPC.settingsGet, () => settings.get());
  handle(IPC.settingsSave, (value) => { const saved = settings.save(appSettingsSchema.parse(value)); if (process.platform === 'win32') app.setLoginItemSettings({ openAtLogin: saved.startWithWindows }); return saved; });
  handle(IPC.stopPrepare, async (rawRequest: StopRequest) => {
    const request = stopRequestSchema.parse(rawRequest);
    const snapshot = await provider.getSnapshot();
    const requestedPid = Number(request.identity?.pid); const record = snapshot.records.find((r) => r.key === request.key && r.pid === requestedPid);
    if (!record) throw new Error('端口记录已变化，请刷新后重试');
    for (const metric of app.getAppMetrics()) selfTree.add(metric.pid);
    const identity: ProcessIdentity = { pid: record.pid, processName: record.processName, processPath: record.processPath, startedAt: record.startedAt, user: record.user, isCritical: record.isCritical };
    const decision = evaluateTarget(identity, record.services, selfTree, process.env.USERNAME ?? '', request.serviceName); if (!decision.allowed) throw new Error(decision.reason);
    if (decision.requiresElevation && !isAdministrator) return { status: 'blocked', message: '此操作需要管理员权限', requiresElevation: true };
    const plan = await stopService.prepare({ ...request, identity }); prepared.set(request.key, { plan, canForce: false });
    return { status: 'failed', message: '目标已验证，可以执行温和关闭' };
  });
  handle(IPC.stopExecute, async (rawRequest: StopRequest) => {
    const request = stopRequestSchema.parse(rawRequest); const entry = prepared.get(request.key); if (!entry) throw new Error('请先确认停止操作'); const { plan } = entry;
    activeStops++; let result: StopResult;
    try { result = await stopService.execute(plan); } catch (error) { result = { status: 'unknown', message: error instanceof Error ? error.message : '停止操作状态未知' }; } finally { activeStops--; }
    if (result.requiresForce && !plan.request.serviceName) entry.canForce = true; else prepared.delete(request.key);
    audit.append({ action: 'stop', pid: plan.confirmedIdentity.pid, processName: plan.confirmedIdentity.processName, port: Number(request.key.split('|')[2]), protocol: request.key.startsWith('UDP') ? 'UDP' : 'TCP', serviceName: plan.request.serviceName ?? '', method: plan.request.serviceName ? 'service' : 'graceful', privilege: isAdministrator ? 'administrator' : 'standard', result: result.status, message: result.message }); return result;
  });
  handle(IPC.stopForce, async (rawKey: string) => {
    const key = typeof rawKey === 'string' && rawKey.length <= 512 ? rawKey : ''; const entry = prepared.get(key); if (!entry?.canForce) throw new Error('强制结束请求已失效或尚未经过温和关闭'); const { plan } = entry;
    prepared.delete(key); activeStops++; let result: StopResult;
    try { result = await stopService.force(stopService.authorizeForce(plan)); } catch (error) { result = { status: 'unknown', message: error instanceof Error ? error.message : '强制结束状态未知' }; } finally { activeStops--; }
    audit.append({ action: 'force-stop', pid: plan.confirmedIdentity.pid, processName: plan.confirmedIdentity.processName, port: Number(key.split('|')[2]), protocol: key.startsWith('UDP') ? 'UDP' : 'TCP', serviceName: '', method: 'force', privilege: isAdministrator ? 'administrator' : 'standard', result: result.status, message: result.message }); return result;
  });
  handle(IPC.logsGet, () => audit.list());
  handle(IPC.logsClear, () => audit.clear());
  handle(IPC.logsExport, async (format: 'json' | 'csv') => {
    if (!['json', 'csv'].includes(format)) throw new Error('不支持的导出格式');
    const result = await dialog.showSaveDialog({ title: '导出 PortLens 操作日志', defaultPath: `portlens-audit.${format}`, filters: [{ name: format.toUpperCase(), extensions: [format] }] });
    if (result.canceled || !result.filePath) return false; await writeFile(result.filePath, format === 'json' ? audit.toJson() : audit.toCsv(), 'utf8'); return true;
  });
  handle(IPC.elevationRequest, () => new Promise<boolean>((resolve, reject) => {
    const executable = process.execPath.replaceAll("'", "''");
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `Start-Process -FilePath '${executable}' -Verb RunAs`], { windowsHide: true }, (error) => { if (error) reject(error); else { resolve(true); setTimeout(() => app.quit(), 250); } });
  }));
  return { isStopping: () => activeStops > 0 };
}
