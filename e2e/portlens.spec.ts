import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';

let application: ElectronApplication;
let page: Page;

test.beforeEach(async () => {
  application = await electron.launch({ args: ['.'], env: { ...process.env, PORTLENS_E2E_FIXTURE: '1' } });
  page = await application.firstWindow();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByText('node.exe').first()).toBeVisible();
});

test.afterEach(async () => { if (application) await application.close(); });

test('searches ports, preserves related details, and requires confirmation', async () => {
  await page.getByLabel('搜索').fill('3000 node');
  await expect(page.getByRole('button', { name: /3000 TCP.*node\.exe/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /3001 TCP.*node\.exe/ })).toHaveCount(0);
  await page.getByRole('button', { name: /3000 TCP.*node\.exe/ }).click();
  await expect(page.getByText('3000、3001')).toBeVisible();
  await page.getByRole('button', { name: '结束进程' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('node server.js --environment test');
  await expect(dialog).toContainText('3000、3001');
  await expect(page.getByRole('button', { name: '确认并尝试关闭' })).toBeVisible();
});

test('filters UDP bindings and exposes settings and audit-log UI', async () => {
  await page.getByLabel('协议').selectOption('UDP');
  await expect(page.getByText('dns-helper.exe').first()).toBeVisible();
  await expect(page.getByText('已绑定').first()).toBeVisible();
  await page.getByRole('button', { name: '设置' }).click();
  await expect(page.getByRole('dialog', { name: '设置' })).toContainText('3 秒');
  await page.getByRole('button', { name: '查看操作日志' }).click();
  await expect(page.getByLabel('操作日志')).toContainText('保留 7 天');
  await expect(page.getByRole('button', { name: '导出 JSON' })).toBeVisible();
  await expect(page.getByRole('button', { name: '导出 CSV' })).toBeVisible();
});

test('keeps the workbench usable at narrow supported width', async () => {
  await page.setViewportSize({ width: 820, height: 700 });
  await expect(page.getByLabel('监听端口')).toBeVisible();
  await expect(page.getByText('端口详情')).toBeVisible();
});
