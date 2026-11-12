import { cp, mkdir } from 'node:fs/promises';
await mkdir('dist/main/system/scripts', { recursive: true });
await cp('src/main/system/scripts/get-port-snapshot.ps1', 'dist/main/system/scripts/get-port-snapshot.ps1');
