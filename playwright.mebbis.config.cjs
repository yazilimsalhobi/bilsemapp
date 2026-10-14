const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir:'./tests/browser', testMatch:['mebbis.spec.cjs','attendance-transfer.spec.cjs','automatic-transfer.spec.cjs'], workers:1,
  use:{browserName:'chromium',headless:true,viewport:{width:390,height:844}},
  webServer:{command:'node tests/dev-server.cjs',url:'http://127.0.0.1:8765',reuseExistingServer:!process.env.CI}
});
