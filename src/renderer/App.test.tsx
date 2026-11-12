import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const records = [
  { key: 'TCP|127.0.0.1|3000|42', protocol: 'TCP', localAddress: '127.0.0.1', localPort: 3000, pid: 42, processName: 'node.exe', processPath: 'C:/node.exe', commandLine: 'node server.js', user: 'dev', startedAt: '2026-11-11T00:00:00Z', services: [], state: 'LISTENING', isElevated: false, isCritical: false },
  { key: 'TCP|127.0.0.1|3001|42', protocol: 'TCP', localAddress: '127.0.0.1', localPort: 3001, pid: 42, processName: 'node.exe', processPath: 'C:/node.exe', commandLine: 'node server.js', user: 'dev', startedAt: '2026-11-11T00:00:00Z', services: [], state: 'LISTENING', isElevated: false, isCritical: false },
  { key: 'UDP|0.0.0.0|5353|7', protocol: 'UDP', localAddress: '0.0.0.0', localPort: 5353, pid: 7, processName: 'dns.exe', processPath: 'C:/dns.exe', commandLine: '', user: 'SYSTEM', startedAt: '', services: [], state: 'BOUND', isElevated: true, isCritical: false }
];
beforeEach(() => { (window as any).portLens = { getSnapshot: vi.fn(async () => ({ capturedAt: new Date().toISOString(), records })), getSettings: vi.fn(async () => ({ refreshInterval: 3, refreshPaused: false, minimizeToTray: false, startWithWindows: false })), saveSettings: vi.fn(), prepareStop: vi.fn(async () => ({ status: 'failed', message: 'ready' })), executeStop: vi.fn(async () => ({ status: 'stopped', message: 'done' })), confirmForceStop: vi.fn(async () => ({ status: 'stopped', message: 'done' })), getLogs: vi.fn(async () => [{ id: '1', timestamp: '2026-11-11T00:00:00Z', action: 'stop', pid: 42, processName: 'node.exe', port: 3000, protocol: 'TCP', serviceName: '', method: 'graceful', privilege: 'standard', result: 'stopped', message: 'ok' }]), clearLogs: vi.fn(), exportLogs: vi.fn(async () => true), requestElevation: vi.fn(async () => true), subscribeStopProgress: vi.fn(() => () => {}) }; });

describe('App', () => {
  it('shows listening ports and filters by unified search', async () => {
    render(<App />);
    expect((await screen.findAllByText('node.exe'))[0]).toBeVisible();
    fireEvent.change(screen.getByPlaceholderText(/端口、进程/), { target: { value: '5353' } });
    expect(within(screen.getByLabelText('监听端口')).queryByText('node.exe')).not.toBeInTheDocument();
    expect(within(screen.getByLabelText('监听端口')).getByText('dns.exe')).toBeVisible();
  });
  it('shows details and always confirms before stop', async () => {
    render(<App />); fireEvent.click((await screen.findAllByText('node.exe'))[0]);
    expect(screen.getByText('node server.js')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '结束进程' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('将结束 node.exe');
    expect(screen.getByRole('dialog')).toHaveTextContent('node server.js');
    expect(screen.getByRole('dialog')).toHaveTextContent('3000、3001');
    expect((window as any).portLens.executeStop).not.toHaveBeenCalled();
  });
  it('labels UDP bindings separately', async () => { render(<App />); await waitFor(() => expect(screen.getByText('已绑定')).toBeVisible()); });
  it('freezes the confirmed target while an in-flight refresh completes', async () => {
    let resolveRefresh!: (value: unknown) => void;
    const api = (window as any).portLens;
    api.getSnapshot
      .mockResolvedValueOnce({ capturedAt: new Date().toISOString(), records })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRefresh = resolve; }));
    render(<App />);
    fireEvent.click((await screen.findAllByText('node.exe'))[0]);
    fireEvent.click(screen.getByRole('button', { name: '刷新' }));
    fireEvent.click(screen.getByRole('button', { name: '结束进程' }));
    resolveRefresh({ capturedAt: new Date().toISOString(), records: [{ ...records[0], key: 'TCP|127.0.0.1|3000|99', pid: 99, processName: 'other.exe' }] });
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('PID 42'));
    fireEvent.click(screen.getByRole('button', { name: '确认并尝试关闭' }));
    await waitFor(() => expect(api.prepareStop).toHaveBeenCalledWith(expect.objectContaining({ key: records[0].key, identity: expect.objectContaining({ pid: 42 }) })));
  });
  it('keeps port discovery single-flight while a slow query is pending', async () => {
    const api = (window as any).portLens;
    api.getSnapshot.mockImplementation(() => new Promise(() => {}));
    render(<App />);
    await waitFor(() => expect(api.getSnapshot).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: '刷新' }));
    fireEvent.click(screen.getByRole('button', { name: '刷新' }));
    expect(api.getSnapshot).toHaveBeenCalledTimes(1);
  });
  it('lets operators view, clear, and export audit logs in both formats', async () => {
    render(<App />); await screen.findAllByText('node.exe');
    fireEvent.click(screen.getByRole('button', { name: '设置' }));
    fireEvent.click(screen.getByRole('button', { name: '查看操作日志' }));
    expect(await screen.findByText(/node\.exe · PID 42/)).toBeVisible();
    expect(screen.getByRole('button', { name: '导出 JSON' })).toBeVisible();
    expect(screen.getByRole('button', { name: '导出 CSV' })).toBeVisible();
    expect(screen.getByRole('button', { name: '清空日志' })).toBeVisible();
  });
});
