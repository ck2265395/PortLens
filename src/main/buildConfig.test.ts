// @vitest-environment node
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('uses relative asset paths for packaged file URLs', () => {
  expect(readFileSync('vite.config.ts', 'utf8')).toMatch(/base:\s*['"]\.\/['"]/);
});
