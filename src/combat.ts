// UTF-8 — deterministic fixed-step core, shared by the game and simulations.
import { CONFIG as C, cellX } from "./config";
export type Plant = {
  uid: number;
  type: number;
  row: number;
  col: number;
  x: number;
  hp: number;
  shot: number;
  income: number;
  hurt: number;
  action: number;
};
export type Zombie = {
  uid: number;
  type: number;
  row: number;
  x: number;
  hp: number;
  slow: number;
  hurt: number;
  action: "walk" | "eat" | "death";
  death: number;
  bite: number;
};
export type Shot = {
  uid: number;
  row: number;
  x: number;
  damage: number;
  ice: boolean;
};
export type Event = {
  type:
    | "plant"
    | "spawn"
    | "shot"
    | "hit"
    | "kill"
    | "sun"
    | "bite"
    | "breach"
    | "end";
  x: number;
  row: number;
  uid?: number;
};
export class Battle {
  time = 0;
  sun = C.startSun;
  brain = C.startBrain;
  breaches = 0;
  kills = 0;
  winner: "" | "plants" | "zombies" = "";
  paused = false;
  uid = 0;
  plants: Plant[] = [];
  zombies: Zombie[] = [];
  shots: Shot[] = [];
  pcd = C.plants.map(() => 0);
  zcd = C.zombies.map(() => 0);
  events: Event[] = [];
  place(type: number, row: number, col: number) {
    const p = C.plants[type];
    if (
      !p ||
      this.paused ||
      this.winner ||
      !Number.isInteger(row) ||
      !Number.isInteger(col) ||
      row < 0 ||
      row >= 5 ||
      col < 0 ||
      col >= 9
    )
      return false;
    if (
      this.sun < p.cost ||
      this.pcd[type] > 0 ||
      this.plants.some((p) => p.row === row && p.col === col)
    )
      return false;
    this.sun -= p.cost;
    this.pcd[type] = p.cooldown;
    const uid = ++this.uid;
    this.plants.push({
      uid,
      type,
      row,
      col,
      x: cellX(col),
      hp: p.hp,
      shot: 0.3,
      income: p.incomeRate,
      hurt: 0,
      action: 0,
    });
    this.events.push({ type: "plant", x: cellX(col), row, uid });
    return true;
  }
  spawn(type: number, row: number) {
    const z = C.zombies[type];
    if (
      !z ||
      this.paused ||
      this.winner ||
      !Number.isInteger(row) ||
      row < 0 ||
      row >= 5 ||
      this.brain < z.cost ||
      this.zcd[type] > 0
    )
      return false;
    this.brain -= z.cost;
    this.zcd[type] = z.cooldown;
    const uid = ++this.uid;
    this.zombies.push({
      uid,
      type,
      row,
      x: C.spawnX,
      hp: z.hp,
      slow: 0,
      hurt: 0,
      action: "walk",
      death: 0,
      bite: 0,
    });
    this.events.push({ type: "spawn", x: C.spawnX, row, uid });
    return true;
  }
  step(dt: number) {
    if (this.paused || this.winner) return;
    this.time += dt;
    this.sun = Math.min(C.maxResource, this.sun + C.sunPerSecond * dt);
    this.brain = Math.min(
      C.maxResource,
      this.brain + (C.brainPerSecond + this.time * C.brainRamp) * dt,
    );
    this.pcd = this.pcd.map((t) => Math.max(0, t - dt));
    this.zcd = this.zcd.map((t) => Math.max(0, t - dt));
    for (const p of this.plants) {
      const def = C.plants[p.type];
      p.hurt = Math.max(0, p.hurt - dt);
      p.action = Math.max(0, p.action - dt);
      p.shot -= dt;
      p.income -= dt;
      if (def.income && p.income <= 0) {
        this.sun = Math.min(C.maxResource, this.sun + def.income);
        p.income += def.incomeRate;
        this.events.push({ type: "sun", x: p.x, row: p.row });
      }
      if (
        def.damage &&
        p.shot <= 0 &&
        this.zombies.some((z) => z.hp > 0 && z.row === p.row && z.x > p.x)
      ) {
        p.shot = def.fireRate;
        p.action = 0.6;
        this.shots.push({
          uid: ++this.uid,
          row: p.row,
          x: p.x + 26,
          damage: def.damage,
          ice: p.type === 3,
        });
        this.events.push({ type: "shot", x: p.x, row: p.row, uid: p.uid });
      }
    }
    const removed = new Set<number>();
    for (const s of this.shots) {
      const from = s.x;
      s.x += C.projectileSpeed * dt;
      const target = this.zombies
        .filter(
          (z) =>
            z.hp > 0 &&
            z.row === s.row &&
            z.x + C.hitRadius >= from &&
            z.x - C.hitRadius <= s.x,
        )
        .sort((a, b) => a.x - b.x)[0];
      if (target) {
        target.hp -= s.damage;
        target.hurt = 0.15;
        if (s.ice) target.slow = C.slowDuration;
        removed.add(s.uid);
        this.events.push({
          type: "hit",
          x: target.x,
          row: s.row,
          uid: target.uid,
        });
        if (target.hp <= 0) {
          target.action = "death";
          target.death = C.deathSeconds;
          this.kills++;
          this.events.push({
            type: "kill",
            x: target.x,
            row: target.row,
            uid: target.uid,
          });
        }
      }
      if (s.x > 1400) removed.add(s.uid);
    }
    this.shots = this.shots.filter((s) => !removed.has(s.uid));
    for (const z of this.zombies) {
      if (z.hp <= 0) {
        z.death -= dt;
        continue;
      }
      const def = C.zombies[z.type];
      z.hurt = Math.max(0, z.hurt - dt);
      z.slow = Math.max(0, z.slow - dt);
      const slow = z.slow > 0 ? C.slowFactor : 1;
      const p = this.plants
        .filter(
          (p) =>
            p.hp > 0 &&
            p.row === z.row &&
            z.x - p.x >= -8 &&
            z.x - p.x < C.biteDistance,
        )
        .sort((a, b) => b.x - a.x)[0];
      if (p) {
        z.action = "eat";
        p.hp -= def.dps * slow * dt;
        p.hurt = 0.1;
        z.bite -= dt;
        if (z.bite <= 0) {
          z.bite = 0.7;
          this.events.push({ type: "bite", x: p.x, row: p.row });
        }
      } else {
        z.action = "walk";
        z.x -= def.speed * slow * dt;
      }
      if (z.x < C.breachX) {
        z.hp = 0;
        z.death = 0;
        this.breaches++;
        this.events.push({ type: "breach", x: z.x, row: z.row });
      }
    }
    this.plants = this.plants.filter((p) => p.hp > 0);
    this.zombies = this.zombies.filter((z) => z.hp > 0 || z.death > 0);
    // A breach on the final tick takes precedence over the defence timer.
    if (this.breaches >= C.breachesToWin) this.winner = "zombies";
    else if (this.time >= C.duration) this.winner = "plants";
    if (this.winner) this.events.push({ type: "end", x: 700, row: 2 });
  }
  drain() {
    const events = this.events;
    this.events = [];
    return events;
  }
}
