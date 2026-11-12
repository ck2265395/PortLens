import { describe, expect, it, vi } from 'vitest';

const BrowserWindow = vi.fn(function (this: { options: unknown; loadFile: ReturnType<typeof vi.fn>; loadURL: ReturnType<typeof vi.fn>; webContents: { setWindowOpenHandler: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> } }, options: unknown) {
  this.options = options;
  this.loadFile = vi.fn();
  this.loadURL = vi.fn();
  this.webContents = { setWindowOpenHandler: vi.fn(), on: vi.fn() };
});
vi.mock('electron', () => ({ BrowserWindow }));

describe('createMainWindow', () => {
  it('isolates renderer from Node', async () => {
    const { createMainWindow } = await import('./window.js');
    createMainWindow();
    expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({ webPreferences: expect.objectContaining({ contextIsolation: true, nodeIntegration: false, sandbox: true }) }));
    expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({ webPreferences: expect.objectContaining({ preload: expect.stringMatching(/index\.cjs$/) }) }));
    const instance = BrowserWindow.mock.instances.at(-1) as any;
    expect(instance.webContents.setWindowOpenHandler).toHaveBeenCalled();
    expect(instance.webContents.on).toHaveBeenCalledWith('will-navigate', expect.any(Function));
    const navigate = instance.webContents.on.mock.calls.find((call: unknown[]) => call[0] === 'will-navigate')[1];
    const external = { preventDefault: vi.fn() }; navigate(external, 'https://evil.example'); expect(external.preventDefault).toHaveBeenCalled();
    const local = { preventDefault: vi.fn() }; navigate(local, 'file:///app/index.html'); expect(local.preventDefault).not.toHaveBeenCalled();
  });
});
