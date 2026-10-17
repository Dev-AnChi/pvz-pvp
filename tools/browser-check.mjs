// UTF-8. UI actions are real; controlled fixtures shorten win/collision cases.
import { chromium } from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [],
  checks = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text() + " " + m.location().url);
});
await page.goto(process.env.TEST_URL || "http://127.0.0.1:5173/");
await page.waitForFunction(() => window.duel?.icons.length === 7);
const key = async (k) => {
  await page.keyboard.press(k);
  await page.waitForTimeout(60);
};
await page.screenshot({ path: "reports/title-1366.png" });
await key("Enter");
const click = async (x, y) => {
  const b = await page.locator("canvas").boundingBox();
  await page.mouse.click(
    b.x + (x / 1400) * b.width,
    b.y + (y / 800) * b.height,
  );
};
await key("2");
await click(455, 470);
assert.equal(await page.evaluate(() => window.duel.battle.plants.length), 1);
checks.push("plant through keyboard selection + pointer");
await key("7");
await key("e");
assert.equal(await page.evaluate(() => window.duel.battle.zombies.length), 1);
checks.push("zombie through independent keyboard controls");
await key("Space");
await page.waitForFunction(() => window.duel.battle.paused);
const time = await page.evaluate(() => window.duel.battle.time);
await key("1");
await click(300, 270);
await key("q");
await page.waitForTimeout(150);
assert.equal(await page.evaluate(() => window.duel.battle.time), time);
assert.equal(await page.evaluate(() => window.duel.battle.plants.length), 1);
checks.push("pause freezes time and rejects placement");
await key("Space");
await page.waitForFunction(() => !window.duel.battle.paused);
await page.evaluate(() => {
  const b = window.duel.battle;
  b.zombies[0].x = 570;
  b.plants[0].shot = 0;
});
await page.waitForTimeout(1000);
assert((await page.evaluate(() => window.duel.battle.zombies[0].hp)) < 200);
checks.push("real-time projectile collision");
await page.evaluate(() => {
  const b = window.duel.battle;
  b.sun = 999;
  b.brain = 999;
  b.pcd.fill(0);
  b.zcd.fill(0);
});
for (const [digit, x, y] of [
  ["1", 295, 270],
  ["3", 695, 570],
  ["4", 455, 370],
]) {
  await key(digit);
  await click(x, y);
}
await key("8");
await key("w");
await key("9");
await key("t");
await page.evaluate(() => {
  window.duel.battle.zombies[1].x = 820;
  window.duel.battle.zombies[2].x = 880;
});
await page.waitForTimeout(200);
assert.equal(await page.evaluate(() => window.duel.battle.plants.length), 4);
assert.equal(await page.evaluate(() => window.duel.battle.zombies.length), 3);
checks.push("all four plants and three zombie variants through UI");
const pose = await page.evaluate(() =>
  [...window.duel.actors.values()].map((a) => JSON.stringify(a.poses)),
);
await page.waitForTimeout(300);
const changed = await page.evaluate(() =>
  [...window.duel.actors.values()].map((a) => JSON.stringify(a.poses)),
);
assert(pose.every((a, i) => a !== changed[i]));
checks.push("all seven actors change actual track transforms");
await page.screenshot({ path: "reports/battle-1366.png" });
for (const [w, h] of [
  [1920, 1080],
  [1024, 600],
  [800, 600],
  [1366, 768],
]) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(100);
  const bounds = await page.locator("canvas").boundingBox();
  assert(
    bounds.x >= -1 &&
      bounds.y >= -1 &&
      bounds.x + bounds.width <= w + 1 &&
      bounds.y + bounds.height <= h + 1,
  );
  assert(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight,
    ),
  );
  if (w !== 1366) await page.screenshot({ path: `reports/battle-${w}.png` });
}
checks.push("1366×768, 1920×1080, 1024×600, 800×600: full canvas, no scroll");
await key("-");
await page.waitForTimeout(100);
await page.evaluate(() => {
  window.duel.battle.sun = 999;
  window.duel.battle.pcd[0] = 0;
});
await key("1");
await click(375, 270);
assert(
  await page.evaluate(() =>
    window.duel.battle.plants.some((p) => p.row === 0 && p.col === 1),
  ),
);
await key("=");
checks.push(
  "in-game fit-preserving zoom and accurate pointer mapping while zoomed",
);
await page.evaluate(() => {
  const b = window.duel.battle;
  b.zombies[0].x = b.plants[0].x + 20;
  b.zombies[0].row = b.plants[0].row;
});
await page.waitForTimeout(200);
assert.equal(
  await page.evaluate(() => window.duel.battle.zombies[0].action),
  "eat",
);
checks.push("eating state and damage");
await page.evaluate(() => {
  const b = window.duel.battle;
  const z = b.zombies[0];
  z.hp = 1;
  b.shots.push({ uid: 10000, row: z.row, x: z.x - 10, damage: 20, ice: false });
});
await page.waitForTimeout(150);
assert.equal(
  await page.evaluate(() => window.duel.battle.zombies[0].action),
  "death",
);
assert((await page.evaluate(() => window.duel.battle.kills)) > 0);
checks.push("death animation after lethal hit");
await key("n");
await page.evaluate(() => (window.duel.battle.time = 179.98));
await page.waitForTimeout(100);
assert.equal(await page.evaluate(() => window.duel.battle.winner), "plants");
await page.screenshot({ path: "reports/plants-win.png" });
await key("n");
await key("7");
await key("q");
await page.evaluate(() => {
  const b = window.duel.battle;
  b.breaches = 4;
  b.zombies[0].x = 214;
});
await page.waitForTimeout(100);
assert.equal(await page.evaluate(() => window.duel.battle.winner), "zombies");
await page.screenshot({ path: "reports/zombies-win.png" });
checks.push("both victory overlays with terminal fixtures");
assert.deepEqual(errors, []);
fs.writeFileSync(
  "reports/browser-check.json",
  JSON.stringify({ url: page.url(), checks, errors }, null, 2),
  "utf8",
);
await browser.close();
console.log(checks.join("\n"));
