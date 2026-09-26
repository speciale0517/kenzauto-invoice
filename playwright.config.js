// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  // python3 -m http.server はシングルスレッドのため、並列ワーカー数を上げるとリクエストが
  // 詰まりERR_SOCKET_NOT_CONNECTEDで時々失敗する。安定性を優先し直列実行にする
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4177',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'python3 -m http.server 4177',
    url: 'http://127.0.0.1:4177/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },
});
