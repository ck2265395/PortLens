import { randomUUID } from 'node:crypto';
import type { ProcessIdentity, StopRequest, StopResult } from '../../shared/ports.js';

export type StopPlan = { request: StopRequest; confirmedIdentity: ProcessIdentity; forceToken?: string };
export type ProcessOperations = {
  inspect(pid: number): Promise<ProcessIdentity | null>;
  graceful(identity: ProcessIdentity): Promise<boolean>;
  force(identity: ProcessIdentity): Promise<void>;
  exists(pid: number): Promise<boolean>;
  stopService?(name: string): Promise<void>;
  isServiceRunning?(name: string): Promise<boolean>;
  inspectService?(name: string): Promise<{ pid: number; canStop: boolean; status: string } | null>;
};
const sameIdentity = (a: ProcessIdentity, b: ProcessIdentity) => a.pid === b.pid && a.startedAt === b.startedAt && a.processPath.toLowerCase() === b.processPath.toLowerCase();
const protectedNames = new Set(['smss.exe', 'csrss.exe', 'wininit.exe', 'winlogon.exe', 'lsass.exe']);

export class StopService {
  constructor(private readonly operations: ProcessOperations, private readonly selfTree = new Set<number>()) {}
  async prepare(request: StopRequest): Promise<StopPlan> {
    const current = await this.operations.inspect(request.identity.pid);
    if (!request.serviceName && (!current?.processPath || !current.startedAt)) throw new Error('process identity cannot be verified');
    if (!current || !sameIdentity(current, request.identity)) throw new Error('process identity changed; refresh and try again');
    if (this.selfTree.has(current.pid) || current.isCritical || [0, 4].includes(current.pid) || protectedNames.has(current.processName.toLowerCase())) throw new Error('protected process cannot be stopped');
    return { request, confirmedIdentity: current };
  }
  async execute(plan: StopPlan): Promise<StopResult> {
    const current = await this.operations.inspect(plan.confirmedIdentity.pid);
    if (!current || !sameIdentity(current, plan.confirmedIdentity)) return { status: 'blocked', message: '进程身份已变化' };
    if (this.selfTree.has(current.pid) || current.isCritical || protectedNames.has(current.processName.toLowerCase())) return { status: 'blocked', message: '受保护进程不能停止' };
    if (plan.request.serviceName) {
      if (!this.operations.stopService || !this.operations.isServiceRunning || !this.operations.inspectService) return { status: 'failed', message: 'Windows 服务控制不可用' };
      const service = await this.operations.inspectService(plan.request.serviceName);
      if (!service || service.pid !== current.pid || !service.canStop) return { status: 'blocked', message: '服务身份、宿主进程或可停止状态已变化' };
      await this.operations.stopService(plan.request.serviceName);
      for (let i = 0; i < 20; i++) { if (!(await this.operations.isServiceRunning(plan.request.serviceName))) return { status: 'stopped', message: 'Windows 服务已停止' }; await new Promise((resolve) => setTimeout(resolve, 200)); }
      return { status: 'unknown', message: '服务停止请求已发送，但无法确认最终状态' };
    }
    const supported = await this.operations.graceful(current);
    if (!supported) return { status: 'failed', message: '该后台进程不支持安全的温和关闭', requiresForce: true };
    for (let i = 0; i < 15; i++) { if (!(await this.operations.exists(current.pid))) return { status: 'stopped', message: '进程已正常关闭' }; await new Promise((resolve) => setTimeout(resolve, 200)); }
    return { status: 'failed', message: '温和关闭超时，可选择强制结束', requiresForce: true };
  }
  authorizeForce(plan: StopPlan): StopPlan { return { ...plan, forceToken: randomUUID() }; }
  async force(plan: StopPlan): Promise<StopResult> {
    if (!plan.forceToken) throw new Error('force confirmation is required');
    if (plan.request.serviceName) throw new Error('Windows services cannot be force-stopped by terminating their host process');
    const current = await this.operations.inspect(plan.confirmedIdentity.pid);
    if (!current || !sameIdentity(current, plan.confirmedIdentity)) return { status: 'blocked', message: '进程身份已变化' };
    if (this.selfTree.has(current.pid) || current.isCritical || protectedNames.has(current.processName.toLowerCase())) return { status: 'blocked', message: '受保护进程不能强制结束' };
    await this.operations.force(current);
    return { status: (await this.operations.exists(current.pid)) ? 'unknown' : 'stopped', message: (await this.operations.exists(current.pid)) ? '无法确认进程状态' : '进程已强制结束' };
  }
}
