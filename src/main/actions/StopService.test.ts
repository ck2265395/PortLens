import { describe, expect, it, vi } from 'vitest';
import { StopService } from './StopService.js';

const target = { key: 'TCP|127.0.0.1|3000|42', identity: { pid: 42, processName: 'node.exe', processPath: 'C:/node.exe', startedAt: 'start', isCritical: false }, mode: 'graceful' as const };
describe('StopService', () => {
  it('rejects a process whose identity changed after confirmation', async () => {
    const service = new StopService({ inspect: vi.fn(async () => ({ ...target.identity, startedAt: 'other' })), graceful: vi.fn(), force: vi.fn(), exists: vi.fn() }, new Set());
    await expect(service.prepare(target)).rejects.toThrow('identity changed');
  });
  it('fails closed when a normal process identity cannot be fully verified', async () => {
    const incomplete = { ...target.identity, processPath: '', startedAt: '' };
    const service = new StopService({ inspect: vi.fn(async () => incomplete), graceful: vi.fn(), force: vi.fn(), exists: vi.fn() }, new Set());
    await expect(service.prepare({ ...target, identity: incomplete })).rejects.toThrow('cannot be verified');
  });
  it('reports force required when safe graceful close is unsupported', async () => {
    const service = new StopService({ inspect: vi.fn(async () => target.identity), graceful: vi.fn(async () => false), force: vi.fn(), exists: vi.fn(async () => true) }, new Set());
    const plan = await service.prepare(target);
    await expect(service.execute(plan)).resolves.toMatchObject({ status: 'failed', requiresForce: true });
  });
  it('requires a force confirmation token', async () => {
    const service = new StopService({ inspect: vi.fn(async () => target.identity), graceful: vi.fn(), force: vi.fn(), exists: vi.fn() }, new Set());
    await expect(service.force({ ...(await service.prepare(target)), forceToken: undefined })).rejects.toThrow('confirmation');
  });
  it('stops a named Windows service instead of its host process', async () => {
    const operations = { inspect: vi.fn(async () => target.identity), graceful: vi.fn(), force: vi.fn(), exists: vi.fn(), inspectService: vi.fn(async () => ({ pid: 42, canStop: true, status: 'Running' })), stopService: vi.fn(async () => {}), isServiceRunning: vi.fn(async () => false) };
    const service = new StopService(operations, new Set());
    const plan = await service.prepare({ ...target, serviceName: 'Spooler' });
    await expect(service.execute(plan)).resolves.toMatchObject({ status: 'stopped' });
    expect(operations.stopService).toHaveBeenCalledWith('Spooler');
    expect(operations.graceful).not.toHaveBeenCalled();
  });
  it('never force-kills the host process for a named Windows service', async () => {
    const operations = { inspect: vi.fn(async () => target.identity), graceful: vi.fn(), force: vi.fn(), exists: vi.fn(), stopService: vi.fn(), isServiceRunning: vi.fn() };
    const service = new StopService(operations, new Set());
    const plan = service.authorizeForce(await service.prepare({ ...target, serviceName: 'Spooler' }));
    await expect(service.force(plan)).rejects.toThrow('cannot be force-stopped');
    expect(operations.force).not.toHaveBeenCalled();
  });
  it('blocks a service that moved to another process after confirmation', async () => {
    const operations = { inspect: vi.fn(async () => target.identity), graceful: vi.fn(), force: vi.fn(), exists: vi.fn(), inspectService: vi.fn(async () => ({ pid: 99, canStop: true, status: 'Running' })), stopService: vi.fn(), isServiceRunning: vi.fn() };
    const service = new StopService(operations, new Set());
    const plan = await service.prepare({ ...target, serviceName: 'Spooler' });
    await expect(service.execute(plan)).resolves.toMatchObject({ status: 'blocked' });
    expect(operations.stopService).not.toHaveBeenCalled();
  });
});
