import type { ProcessIdentity, ServiceInfo } from '../../shared/ports.js';
export type TargetPolicyDecision = { allowed: true; requiresElevation: boolean } | { allowed: false; reason: string };
const core = new Set(['smss.exe', 'csrss.exe', 'wininit.exe', 'winlogon.exe', 'lsass.exe']);
export function evaluateTarget(identity: ProcessIdentity, services: ServiceInfo[], selfTree: Set<number>, currentUser = process.env.USERNAME ?? '', serviceName?: string): TargetPolicyDecision {
  if ([0, 4].includes(identity.pid)) return { allowed: false, reason: 'Windows 内核进程受保护' };
  if (selfTree.has(identity.pid)) return { allowed: false, reason: '不能结束 PortLens 自身进程' };
  if (identity.isCritical) return { allowed: false, reason: 'Windows 将此进程标记为关键进程' };
  if (core.has(identity.processName.toLowerCase())) return { allowed: false, reason: '核心登录或会话进程受保护' };
  if (services.length > 1 && !serviceName) return { allowed: false, reason: '共享服务宿主只能停止具体服务' };
  if (serviceName) { const service = services.find((item) => item.name === serviceName); if (!service) return { allowed: false, reason: '目标服务不属于该进程' }; if (!service.canStop) return { allowed: false, reason: 'Windows 不允许停止此服务' }; }
  const otherUser = Boolean(identity.user && currentUser && !identity.user.toLowerCase().endsWith(`\\${currentUser.toLowerCase()}`) && identity.user.toLowerCase() !== currentUser.toLowerCase());
  return { allowed: true, requiresElevation: identity.processPath.toLowerCase().includes('windows') || services.length >= 1 || otherUser };
}
