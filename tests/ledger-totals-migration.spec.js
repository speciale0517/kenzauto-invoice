// 回帰テスト：旧キー名のtotalsスナップショットを含む台帳データで起動時にReferenceErrorが発生し、
// 台帳がメモリ上だけ空になっていた不具合（第7回修正）。
// 原因は`let ledger = loadLedger()`の実行位置が、内部で参照するconst TOTALS_KEY_MIGRATION（TDZ制約が
// ある）の宣言より前にあったこと。旧キー名（seikyu等）のtotalsスナップショットを持つ台帳レコードが
// 1件でもあると起動時に例外が発生し、loadLedger()のtry-catchに握りつぶされて台帳が空になっていた
// （保存自体はlocalStorageに正しく残るため、次回起動時も他の請求書も含め台帳全体が消えたように見える）。
const { test, expect } = require('@playwright/test');

test('旧キー名のtotalsスナップショットを含む台帳データでも例外なく読み込め、新キー名に移行される', async ({ page }) => {
  await page.goto('/index.html');

  await page.evaluate(() => {
    const oldRecord = {
      invNo: '000001',
      docType: 'invoice',
      customer: { code: 'K00001', companyName: 'テスト商店' },
      vehicle: {},
      items: [],
      costs: {},
      sangaku: 0,
      // 第5回修正前の旧キー名で保存された合計金額スナップショット
      totals: {
        gijutsuryou: 20000, buhindai: 10000, nebiki: 0, shohizei: 3000,
        goukei2: 33000, shohi1: 0, sangaku: 0, uriage: 33000,
        seikyu: 33000, kazei10: 30000, kazei10zei: 3000, kazeigai: 0,
      },
    };
    localStorage.setItem('ken_ledger', JSON.stringify([oldRecord]));
  });

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  // リロードして起動時のloadLedger()を再実行させる
  await page.reload();

  expect(errors, `起動時にエラーが発生: ${errors.join('\n')}`).toEqual([]);

  // トップレベルのlet宣言はwindowのプロパティにはならないため、裸の識別子として参照する
  const ledgerAfter = await page.evaluate(() => ledger);
  expect(ledgerAfter.length).toBe(1);
  // 旧キー名(seikyu)が新キー名(billingAmount)へ移行されていること
  expect(ledgerAfter[0].totals.billingAmount).toBe(33000);
});
