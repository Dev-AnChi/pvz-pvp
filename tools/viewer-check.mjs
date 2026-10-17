// UTF-8
import { chromium } from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto((process.env.TEST_URL || "http://127.0.0.1:5173/") + "?viewer");
await page.waitForFunction(() => window.viewer?.actors.length === 7);
await page.screenshot({ path: "reports/viewer-idle.png" });
const before = await page.evaluate(() =>
  window.viewer.actors.map((a) => a.poses),
);
await page.waitForTimeout(500);
const after = await page.evaluate(() =>
  window.viewer.actors.map((a) => a.poses),
);
await page.keyboard.press("e");
await page.waitForTimeout(300);
await page.screenshot({ path: "reports/viewer-eat.png" });
await page.keyboard.press("d");
await page.waitForTimeout(1500);
await page.screenshot({ path: "reports/viewer-death.png" });
await page.keyboard.press("w");
await page.waitForTimeout(100);
await page.keyboard.press("s");
await page.waitForTimeout(500);
await page.screenshot({ path: "reports/viewer-shoot.png" });
await page.keyboard.press("h");
await page.waitForTimeout(650);
await page.screenshot({ path: "reports/viewer-damaged.png" });
assert.deepEqual(errors, []);
assert(before.every((a, i) => JSON.stringify(a) !== JSON.stringify(after[i])));
fs.writeFileSync(
  "reports/viewer-check.json",
  JSON.stringify(
    {
      errors,
      animated: before.map(
        (a, i) => JSON.stringify(a) !== JSON.stringify(after[i]),
      ),
    },
    null,
    2,
  ),
  "utf8",
);
await browser.close();
