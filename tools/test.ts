// UTF-8
import assert from "node:assert/strict";
import fs from "node:fs";
import { Battle } from "../src/combat";
import { CONFIG as C } from "../src/config";
import { Reanim, type Manifest } from "../src/reanim";
const tests: string[] = [];
function test(name: string, fn: () => void) {
  fn();
  tests.push(name);
}
test("placement boundaries, occupied tiles, resources and cooldown", () => {
  const b = new Battle();
  assert.equal(b.place(1, -1, 0), false);
  assert.equal(b.place(1, 0, 9), false);
  assert(b.place(1, 0, 0));
  assert.equal(b.place(0, 0, 0), false);
  assert.equal(b.place(1, 1, 0), false);
  assert.equal(b.sun, 150);
  assert.equal(b.spawn(2, 0), false);
  assert(b.spawn(0, 0));
  assert.equal(b.spawn(0, 1), false);
});
test("pause rejects purchases and freezes simulation", () => {
  const b = new Battle();
  b.paused = true;
  assert.equal(b.place(0, 0, 0), false);
  assert.equal(b.spawn(0, 0), false);
  b.step(10);
  assert.equal(b.time, 0);
});
test("swept projectiles hit the nearest living target", () => {
  const b = new Battle();
  b.spawn(0, 0);
  b.zcd[0] = 0;
  b.brain = 100;
  b.spawn(0, 0);
  b.zombies[0].x = 600;
  b.zombies[1].x = 550;
  b.shots.push({ uid: 99, row: 0, x: 500, damage: 50, ice: true });
  b.step(0.3);
  assert.equal(b.zombies[1].hp, 150);
  assert.equal(b.zombies[0].hp, 200);
  assert(b.zombies[1].slow > 0);
});
test("dead zombies cannot bite or breach", () => {
  const b = new Battle();
  b.place(0, 0, 0);
  b.spawn(0, 0);
  const z = b.zombies[0];
  z.x = b.plants[0].x + 10;
  z.hp = 1;
  b.shots.push({ uid: 100, row: 0, x: z.x - 10, damage: 20, ice: false });
  b.step(C.step);
  assert.equal(b.plants[0].hp, 150);
  assert.equal(z.action, "death");
  assert.equal(b.breaches, 0);
  assert.equal(b.kills, 1);
});
test("zombies eat and destroy plants", () => {
  const b = new Battle();
  b.place(0, 0, 0);
  b.spawn(0, 0);
  b.zombies[0].x = b.plants[0].x + 20;
  for (let i = 0; i < 300; i++) b.step(C.step);
  assert.equal(b.plants.length, 0);
});
test("both win conditions and terminal state", () => {
  const b = new Battle();
  b.time = C.duration - C.step / 2;
  b.step(C.step);
  assert.equal(b.winner, "plants");
  assert.equal(b.spawn(0, 1), false);
  const z = new Battle();
  z.breaches = C.breachesToWin - 1;
  z.spawn(0, 0);
  z.zombies[0].x = C.breachX - 0.1;
  z.step(C.step);
  assert.equal(z.winner, "zombies");
});
test("sunflower production and resource caps", () => {
  const b = new Battle();
  b.place(0, 0, 0);
  for (let i = 0; i < 721; i++) b.step(C.step);
  assert(b.sun > 200 + C.sunPerSecond * 12 + 24);
  b.sun = 999;
  b.brain = 999;
  b.step(1);
  assert.equal(b.sun, 999);
  assert.equal(b.brain, 999);
});
const manifest = JSON.parse(
  fs.readFileSync("public/assets/manifest.json", "utf8"),
) as Manifest;
test("actual Reanim assets, inherited frames and visible variants", () => {
  for (const [name, data] of Object.entries(manifest.animations)) {
    const a = new Reanim(data, name);
    a.update(0);
    const before = JSON.stringify(a.poses);
    a.update(0.4);
    assert.notEqual(JSON.stringify(a.poses), before);
    for (const t of data.tracks)
      for (const p of t.frames) {
        assert(Number.isFinite(p.x));
        if (p.i) assert(manifest.textures[p.i]);
      }
  }
  const z = new Reanim(manifest.animations.Zombie, "Zombie", "cone");
  assert(z.visible("anim_cone"));
  assert(!z.visible("anim_bucket"));
  assert(!z.visible("anim_screendoor"));
});
test("state transition starts from the displayed pose", () => {
  const a = new Reanim(manifest.animations.Zombie, "Zombie");
  a.update(0.7);
  const before = a.poses.map((p) => ({ ...p }));
  a.play("anim_eat");
  a.sample();
  a.poses.forEach((p, i) => {
    if (p.f >= 0 && before[i].f >= 0) {
      assert(Math.abs(p.x - before[i].x) < 1e-6);
      assert(Math.abs(p.y - before[i].y) < 1e-6);
    }
  });
});
test("shooting retains independent stem tracks for both pea plants", () => {
  for (const kind of ["PeaShooterSingle", "SnowPea"]) {
    const a = new Reanim(manifest.animations[kind], kind);
    a.play("anim_shooting", true);
    for (let i = 0; i < 25; i++) {
      a.update(1 / 12);
      a.data.tracks.forEach((track, n) => {
        if (/^(backleaf|stalk|frontleaf)/.test(track.name))
          assert(a.poses[n].f >= 0, track.name);
      });
    }
  }
});
fs.writeFileSync(
  "reports/unit-tests.json",
  JSON.stringify({ passed: tests.length, tests }, null, 2),
  "utf8",
);
console.log(`${tests.length} tests passed`);
