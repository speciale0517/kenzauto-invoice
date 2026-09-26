// 疎通確認：ページが読み込め、コンソールエラーが出ず、5つのタブが揃っていること
const { test, expect } = require('@playwright/test');

const TABS = ['create', 'ledger', 'customers', 'reminder', 'settings'];

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
});

test('ページが読み込め、コンソールエラーが出ない', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.reload();
  await expect(page).toHaveTitle(/ケンズオート/);
  expect(errors, `コンソール/pageerror: ${errors.join('\n')}`).toEqual([]);
});

test('5つのタブがすべて存在し、切り替えができる', async ({ page }) => {
  for (const tab of TABS) {
    const btn = page.locator(`#main-tabs button[data-view="${tab}"]`);
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(btn).toHaveClass(/active/);
    await expect(page.locator(`#view-${tab}`)).toHaveClass(/active/);
  }
});
