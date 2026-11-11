import { describe, expect, it, vi } from 'vitest';

const BrowserWindow = vi.fn(function (this: { options: unknown; loadFile: ReturnType<typeof vi.fn>; loadURL: ReturnType<typeof vi.fn> }, options: unknown) {
  this.options = options;
  this.loadFile = vi.fn();
  this.loadURL = vi.fn();
});
vi.mock('electron', () => ({ BrowserWindow }));

describe('createMainWindow', () => {
  it('isolates renderer from Node', async () => {
    const { createMainWindow } = await import('./window.js');
    createMainWindow();
    expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({ webPreferences: expect.objectContaining({ contextIsolation: true, nodeIntegration: false, sandbox: true }) }));
  });
});
