import { app } from 'electron';
import { createMainWindow } from './window.js';

app.whenReady().then(() => createMainWindow());
app.on('window-all-closed', () => app.quit());
