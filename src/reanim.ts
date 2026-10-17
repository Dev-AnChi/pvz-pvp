// UTF-8 — independent X/Y skew is retained through a full affine matrix.
export type Pose = {
  x: number;
  y: number;
  sx: number;
  sy: number;
  kx: number;
  ky: number;
  f: number;
  a: number;
  i: string;
};
export type Animation = {
  fps: number;
  tracks: { name: string; frames: Pose[] }[];
  clips: Record<string, { start: number; end: number }>;
};
export type Manifest = {
  animations: Record<string, Animation>;
  textures: Record<string, string>;
  audio: Record<string, string>;
};
const fields = ["x", "y", "sx", "sy", "kx", "ky", "a"] as const;
const tintCache = new WeakMap<
  HTMLImageElement,
  Map<string, HTMLCanvasElement>
>();
function tinted(image: HTMLImageElement, filter: string): HTMLCanvasElement {
  let cache = tintCache.get(image);
  if (!cache) {
    cache = new Map();
    tintCache.set(image, cache);
  }
  let canvas = cache.get(filter);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d")!;
    ctx.filter = filter;
    ctx.drawImage(image, 0, 0);
    cache.set(filter, canvas);
  }
  return canvas;
}
export function interpolate(a: Pose, b: Pose, t: number): Pose {
  const p = { ...a };
  for (const k of fields) p[k] = a[k] + (b[k] - a[k]) * t;
  return p;
}
export class Reanim {
  time = 0;
  clock = 0;
  clip = "";
  once = false;
  previous: Pose[] | null = null;
  blend = 1;
  poses: Pose[] = [];
  hurt = 0;
  frozen = false;
  armor = true;
  damage = 0;
  constructor(
    public data: Animation,
    public kind: string,
    public variant = "normal",
  ) {
    this.play(
      kind === "Zombie"
        ? "anim_walk"
        : data.clips.anim_full_idle
          ? "anim_full_idle"
          : "anim_idle",
      false,
      0,
    );
  }
  play(clip: string, once = false, blend = 0.16) {
    if (clip === this.clip) return;
    this.previous = this.poses.length
      ? this.poses.map((p) => ({ ...p }))
      : null;
    this.blend = blend ? 0 : 1;
    this.clip = clip;
    this.time = 0;
    this.once = once;
  }
  get range() {
    return (
      this.data.clips[this.clip] ?? {
        start: 0,
        end: this.data.tracks[0].frames.length - 1,
      }
    );
  }
  get duration() {
    return Math.max(1, this.range.end - this.range.start) / this.data.fps;
  }
  get finished() {
    return this.once && this.time >= this.duration;
  }
  update(dt: number) {
    this.time += dt;
    this.clock += dt;
    this.blend = Math.min(1, this.blend + dt / 0.16);
    this.hurt = Math.max(0, this.hurt - dt);
    this.sample();
  }
  sample() {
    const { start, end } = this.range;
    const span = Math.max(1, end - start);
    const frame =
      start +
      (this.once
        ? Math.min(span, this.time * this.data.fps)
        : (this.time * this.data.fps) % span);
    const i = Math.floor(frame),
      j = Math.min(end, i + 1),
      t = frame - i;
    this.poses = this.data.tracks.map((track, n) => {
      let p = interpolate(track.frames[i], track.frames[j], t);
      // Pea files store stem and head on independent timeline sections. Keep the
      // stem running while the head plays shooting, as in the original layering.
      if (
        this.data.clips.anim_full_idle &&
        /^(backleaf|stalk|frontleaf)/.test(track.name)
      ) {
        const r = this.data.clips.anim_idle;
        const f =
            r.start +
            ((this.clock * this.data.fps) % Math.max(1, r.end - r.start)),
          a = Math.floor(f);
        p = interpolate(
          track.frames[a],
          track.frames[Math.min(r.end, a + 1)],
          f - a,
        );
      }
      if (
        this.previous &&
        this.blend < 1 &&
        p.f >= 0 &&
        this.previous[n].f >= 0
      ) {
        const target = p;
        const old = { ...this.previous[n] };
        for (const k of ["kx", "ky"] as const)
          old[k] = p[k] + (((old[k] - p[k] + 540) % 360) - 180);
        p = interpolate(old, p, this.blend);
        p.i = target.i;
        p.f = target.f;
      }
      return p;
    });
    return this.poses;
  }
  visible(name: string) {
    if (this.kind !== "Zombie") return true;
    if (/screendoor|flaghand|duckytube|whitewater|mustache/i.test(name))
      return false;
    if (name === "anim_cone") return this.variant === "cone" && this.armor;
    if (name === "anim_bucket") return this.variant === "bucket" && this.armor;
    return true;
  }
  draw(
    ctx: CanvasRenderingContext2D,
    images: Record<string, HTMLImageElement>,
    x: number,
    y: number,
    scale: number,
    alpha = 1,
  ) {
    if (!this.poses.length) this.sample();
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(
      this.kind === "Zombie" ? -40 : -40,
      this.kind === "Zombie" ? -120 : -75,
    );
    for (let n = 0; n < this.poses.length; n++) {
      const p = this.poses[n];
      if (p.f < 0 || !p.i || !this.visible(this.data.tracks[n].name)) continue;
      let id = p.i;
      if (this.damage > 0) {
        if (id === "IMAGE_REANIM_WALLNUT_BODY")
          id = "IMAGE_REANIM_WALLNUT_CRACKED" + this.damage;
        else if (/ZOMBIE_(CONE|BUCKET)1$/.test(id))
          id = id.slice(0, -1) + (this.damage + 1);
      }
      const image = images[id];
      if (!image) throw new Error("Missing texture " + id);
      const kx = (p.kx * Math.PI) / 180,
        ky = (p.ky * Math.PI) / 180;
      ctx.save();
      ctx.transform(
        Math.cos(kx) * p.sx,
        Math.sin(kx) * p.sx,
        -Math.sin(ky) * p.sy,
        Math.cos(ky) * p.sy,
        p.x,
        p.y,
      );
      ctx.globalAlpha = p.a * alpha;
      const filter =
        this.hurt > 0
          ? "brightness(1.8)"
          : this.frozen
            ? "sepia(.4) hue-rotate(140deg) saturate(1.5)"
            : "";
      ctx.drawImage(filter ? tinted(image, filter) : image, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }
}
