const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "tests",
  timeout: 60000,
  use: { baseURL: "http://localhost:4173", launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {} },
  webServer: {
    command: "npx serve -l 4173 .",
    url: "http://localhost:4173",
    reuseExistingServer: true,
    timeout: 60000
  }
});
