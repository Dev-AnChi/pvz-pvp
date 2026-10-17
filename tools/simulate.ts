// UTF-8. Uses the same Battle class and fixed step as the browser.
import { Battle } from "../src/combat";
import { CONFIG as C } from "../src/config";
import fs from "node:fs";
const report: {
  strategy: string;
  matches: number;
  plants: number;
  zombies: number;
  breaches: number;
  meanKills: number;
}[] = [];
for (const strategy of ["economy", "balanced", "rush", "ice"])
  for (const attack of ["spread", "focus", "armor"]) {
    let wins = 0,
      breaches = 0,
      kills = 0;
    for (let seed = 1; seed <= 30; seed++) {
      let rng = seed;
      const random = () => {
        rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
        return rng / 4294967296;
      };
      const b = new Battle();
      let decision = 0;
      const focus = seed % 5;
      while (!b.winner) {
        if (b.time >= decision) {
          decision += 0.4;
          const row = Math.floor(random() * 5);
          const occupied = (r: number, c: number) =>
            b.plants.some((p) => p.row === r && p.col === c);
          const threat = b.zombies
            .filter((z) => z.hp > 0)
            .sort((a, b) => a.x - b.x)[0];
          const lane = threat?.row ?? row;
          if (
            strategy === "economy" &&
            b.time < 65 &&
            b.plants.filter((p) => p.type === 0).length < 8
          ) {
            for (let c = 0; c < 2; c++)
              if (!occupied(row, c) && b.place(0, row, c)) break;
          } else if (
            strategy === "balanced" &&
            b.time < 40 &&
            b.plants.filter((p) => p.type === 0).length < 4 &&
            !occupied(row, 0)
          )
            b.place(0, row, 0);
          else {
            const r = strategy === "rush" ? row : lane;
            if (threat && threat.x < 650 && !occupied(r, 5)) b.place(2, r, 5);
            for (let c = 1; c < 5; c++)
              if (
                !occupied(r, c) &&
                b.place(strategy === "ice" && c === 1 ? 3 : 1, r, c)
              )
                break;
          }
          b.spawn(
            attack === "armor"
              ? 2
              : attack === "focus"
                ? random() < 0.3
                  ? 1
                  : 0
                : Math.floor(random() * 3),
            attack === "focus" ? focus : Math.floor(random() * 5),
          );
        }
        b.step(C.step);
        b.drain();
        if (
          !Number.isFinite(b.sun) ||
          b.sun < 0 ||
          b.brain < 0 ||
          b.plants.length > 45 ||
          new Set(b.plants.map((p) => `${p.row}:${p.col}`)).size !==
            b.plants.length
        )
          throw new Error("Invariant failed " + seed);
      }
      if (b.winner === "plants") wins++;
      breaches += b.breaches;
      kills += b.kills;
    }
    report.push({
      strategy: strategy + " / " + attack,
      matches: 30,
      plants: wins,
      zombies: 30 - wins,
      breaches: breaches / 30,
      meanKills: kills / 30,
    });
  }
fs.writeFileSync(
  "reports/simulation.json",
  JSON.stringify(
    {
      matches: 360,
      step: C.step,
      config: C,
      results: report,
      limitations:
        "Scripted bots, no human playtesting. Win rates describe these policies only; not proof of absolute balance.",
    },
    null,
    2,
  ),
  "utf8",
);
console.table(report);
