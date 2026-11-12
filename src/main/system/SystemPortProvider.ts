import type { PortSnapshot } from '../../shared/ports.js';
export interface SystemPortProvider { getSnapshot(signal?: AbortSignal): Promise<PortSnapshot>; }
