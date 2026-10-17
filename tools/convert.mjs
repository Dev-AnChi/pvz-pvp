// UTF-8. Reanim XML fragments contain sparse, inherited per-frame transforms.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const root = path.resolve(
    process.env.PVZ_ASSETS || "../PvZ_Source/PvZ_Assets-main",
  ),
  out = path.resolve("public/assets");
fs.mkdirSync(out, { recursive: true });
const walk = (p) =>
  fs
    .readdirSync(p, { withFileTypes: true })
    .flatMap((d) =>
      d.isDirectory() ? walk(path.join(p, d.name)) : [path.join(p, d.name)],
    );
const files = walk(root),
  inventory = files.map((p) => ({
    path: path.relative(root, p).replaceAll("\\", "/"),
    bytes: fs.statSync(p).size,
    sha256: crypto
      .createHash("sha256")
      .update(fs.readFileSync(p))
      .digest("hex"),
  }));
fs.writeFileSync(
  "reports/asset-inventory.json",
  JSON.stringify(inventory, null, 2),
  "utf8",
);
const names = ["PeaShooterSingle", "SunFlower", "SnowPea", "Wallnut", "Zombie"];
const defaults = { x: 0, y: 0, sx: 1, sy: 1, kx: 0, ky: 0, f: 0, a: 1, i: "" };
export function parse(text) {
  const tracks = [...text.matchAll(/<track>([\s\S]*?)<\/track>/g)].map((m) => {
    const name = m[1].match(/<name>(.*?)<\/name>/)[1];
    let prev = { ...defaults };
    const frames = [...m[1].matchAll(/<t>([\s\S]*?)<\/t>/g)].map((t) => {
      const f = { ...prev };
      for (const v of t[1].matchAll(/<(x|y|sx|sy|kx|ky|f|a|i)>(.*?)<\/\1>/g))
        f[v[1]] = v[1] === "i" ? v[2] : Number(v[2]);
      prev = f;
      return f;
    });
    return { name, frames };
  });
  const clips = {};
  for (const t of tracks.filter((t) => t.name.startsWith("anim_"))) {
    const ids = t.frames.flatMap((f, i) => (f.f >= 0 ? [i] : []));
    if (ids.length) clips[t.name] = { start: ids[0], end: ids.at(-1) };
  }
  return { fps: Number(text.match(/<fps>(.*?)<\/fps>/)[1]), tracks, clips };
}
const imageFiles = files.filter((p) => /\.(png|jpg)$/i.test(p));
const byId = new Map(
  imageFiles
    .filter((p) => p.includes(`${path.sep}reanim${path.sep}`))
    .map((p) => [
      "IMAGE_REANIM_" + path.basename(p, path.extname(p)).toUpperCase(),
      p,
    ]),
);
const animations = {},
  textures = {},
  missing = [];
// Inspect every Reanim, not just the five used in combat.
const analysis = files
  .filter((p) => p.endsWith(".reanim"))
  .map((p) => {
    const d = parse(fs.readFileSync(p, "utf8"));
    return {
      name: path.basename(p),
      fps: d.fps,
      tracks: d.tracks.length,
      frames: d.tracks[0]?.frames.length,
      clips: d.clips,
    };
  });
for (const name of names) {
  const d = parse(
    fs.readFileSync(path.join(root, "reanim", name + ".reanim"), "utf8"),
  );
  animations[name] = d;
  for (const t of d.tracks)
    for (const f of t.frames)
      if (f.i && !textures[f.i]) {
        const p = byId.get(f.i);
        if (!p) {
          missing.push(f.i);
          continue;
        }
        const dest = "parts/" + path.basename(p);
        fs.mkdirSync(path.join(out, "parts"), { recursive: true });
        fs.copyFileSync(p, path.join(out, dest));
        textures[f.i] = dest;
      }
}
for (const name of [
  "Wallnut_cracked1",
  "Wallnut_cracked2",
  "Zombie_cone2",
  "Zombie_cone3",
  "Zombie_bucket2",
  "Zombie_bucket3",
]) {
  const p = path.join(root, "reanim", name + ".png");
  const dest = "parts/" + name + ".png";
  fs.copyFileSync(p, path.join(out, dest));
  textures["IMAGE_REANIM_" + name.toUpperCase()] = dest;
}
const extras = {
  background: "images/background1.jpg",
  packet: "images/SeedPacket_Larger.png",
  brain: "images/brain.png",
  sun: "reanim/Sun1.png",
  sunRays: "reanim/Sun3.png",
  pea: "images/ProjectilePea.png",
  ice: "images/ProjectileSnowPea.png",
  splat: "particles/pea_splats.png",
  dust: "particles/Dust_puffs.png",
};
for (const [key, rel] of Object.entries(extras)) {
  let p = files.find(
    (p) =>
      path.relative(root, p).replaceAll("\\", "/").toLowerCase() ===
      rel.toLowerCase(),
  );
  if (!p) {
    console.log("Missing optional", key);
    continue;
  }
  const dest = path.basename(p);
  fs.copyFileSync(p, path.join(out, dest));
  textures[key] = dest;
}
const audio = {};
for (const key of [
  "plant",
  "throw",
  "splat",
  "chomp",
  "groan",
  "points",
  "winmusic",
  "losemusic",
]) {
  const p = path.join(root, "sounds", key + ".ogg");
  fs.copyFileSync(p, path.join(out, key + ".ogg"));
  audio[key] = key + ".ogg";
}
if (missing.length)
  throw new Error("Missing Reanim images: " + [...new Set(missing)].join(","));
fs.writeFileSync(
  path.join(out, "manifest.json"),
  JSON.stringify({ animations, textures, audio }),
  "utf8",
);
fs.writeFileSync(
  "reports/reanim-inventory.json",
  JSON.stringify(analysis, null, 2),
  "utf8",
);
console.log(
  JSON.stringify(
    {
      files: files.length,
      reanimations: analysis.length,
      selected: names,
      textures: Object.keys(textures).length,
      missing: missing.length,
      clips: Object.fromEntries(
        Object.entries(animations).map(([k, v]) => [k, v.clips]),
      ),
    },
    null,
    2,
  ),
);
