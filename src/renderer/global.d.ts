import type { PortLensApi } from '../shared/ipc';
declare global { interface Window { portLens: PortLensApi; } }
export {};
