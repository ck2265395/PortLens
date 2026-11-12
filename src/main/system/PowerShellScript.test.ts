import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('port snapshot PowerShell script', () => {
  it('uses bulk process queries instead of one process lookup per endpoint', () => {
    const script = readFileSync(join(process.cwd(), 'src/main/system/scripts/get-port-snapshot.ps1'), 'utf8');
    expect(script).toContain('Get-CimInstance Win32_Process');
    expect(script).toContain('Get-Process -ErrorAction SilentlyContinue');
    expect(script).not.toContain('Win32_Process -Filter');
  });
});
