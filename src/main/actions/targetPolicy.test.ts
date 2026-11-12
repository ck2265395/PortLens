import { describe, expect, it } from 'vitest';
import { evaluateTarget } from './targetPolicy.js';
import type { ProcessIdentity, ServiceInfo } from '../../shared/ports.js';

const identity = (overrides: Partial<ProcessIdentity> = {}): ProcessIdentity => ({ pid: 100, processName: 'node.exe', processPath: 'C:/node.exe', startedAt: '2026-11-11T00:00:00Z', isCritical: false, ...overrides });
describe('evaluateTarget', () => {
  it.each([0, 4])('blocks protected pid %s', (pid) => expect(evaluateTarget(identity({ pid }), [], new Set())).toMatchObject({ allowed: false }));
  it('blocks PortLens process tree', () => expect(evaluateTarget(identity({ pid: 100 }), [], new Set([100]))).toMatchObject({ allowed: false }));
  it('blocks critical and core system processes', () => {
    expect(evaluateTarget(identity({ isCritical: true }), [], new Set()).allowed).toBe(false);
    expect(evaluateTarget(identity({ processName: 'lsass.exe', processPath: 'C:/Windows/System32/lsass.exe' }), [], new Set()).allowed).toBe(false);
    expect(evaluateTarget(identity({ processName: 'lsass.exe', processPath: '' }), [], new Set()).allowed).toBe(false);
  });
  it('blocks direct termination of shared service hosts', () => {
    const services = [{ name: 'a' }, { name: 'b' }] as ServiceInfo[];
    expect(evaluateTarget(identity({ processName: 'svchost.exe' }), services, new Set())).toMatchObject({ allowed: false });
  });
  it('allows stopping one stoppable service in a shared host', () => {
    const services = [{ name: 'One', displayName: 'One', status: 'Running', canStop: true }, { name: 'Two', displayName: 'Two', status: 'Running', canStop: false }];
    expect(evaluateTarget(identity({ processName: 'svchost.exe' }), services, new Set(), '', 'One')).toEqual({ allowed: true, requiresElevation: true });
  });
  it('allows ordinary processes', () => expect(evaluateTarget(identity(), [], new Set())).toEqual({ allowed: true, requiresElevation: false }));
});
