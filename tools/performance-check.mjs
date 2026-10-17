// UTF-8
import { chromium } from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome" }),
  page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
await page.goto("http://127.0.0.1:4173/");
await page.waitForFunction(() => window.duel?.icons.length);
const result = await page.evaluate(async () => {
  const d = window.duel;
  d.reset();
  const gaps = [];
  let last = performance.now();
  const original = d.sys.sceneUpdate.bind(d);
  d.sys.sceneUpdate = (...args) => {
    const now = performance.now();
    gaps.push((now - last) / 1000);
    last = now;
    return original(...args);
  };
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 4; col++) {
      d.battle.sun = 999;
      d.battle.pcd.fill(0);
      d.battle.place(col, row, col);
    }
    for (let z = 0; z < 3; z++) {
      d.battle.brain = 999;
      d.battle.zcd.fill(0);
      d.battle.spawn(z, row);
    }
  }
  let frames = 0;
  const start = performance.now(),
    sim = d.battle.time;
  await new Promise((resolve) => {
    const tick = () => {
      frames++;
      if (performance.now() - start >= 5000) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  return {
    actors: 35,
    frames,
    wallSeconds: (performance.now() - start) / 1000,
    simulationSeconds: d.battle.time - sim,
    maxGap: Math.max(...gaps),
    updateCount: gaps.length,
    clampedSeconds: gaps.reduce((s, g) => s + Math.min(0.25, g), 0),
  };
});
result.fps = result.frames / result.wallSeconds;
result.timeRatio = result.simulationSeconds / result.wallSeconds;
fs.writeFileSync(
  "reports/performance.json",
  JSON.stringify(result, null, 2),
  "utf8",
);
console.log(result);
await browser.close();
assert(result.timeRatio > 0.85 && result.timeRatio < 1.15);
