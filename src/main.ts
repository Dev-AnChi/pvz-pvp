// UTF-8
import Phaser from "phaser";
import { Reanim, type Manifest } from "./reanim";
import { Duel } from "./scene";
class Viewer extends Phaser.Scene {
  manifest!: Manifest;
  images: Record<string, HTMLImageElement> = {};
  actors: Reanim[] = [];
  texture!: Phaser.Textures.CanvasTexture;
  ctx!: CanvasRenderingContext2D;
  paused = false;
  lastTick = performance.now();
  preload() {
    this.load.json("manifest", "assets/manifest.json");
  }
  create() {
    this.manifest = this.cache.json.get("manifest");
    for (const [k, p] of Object.entries(this.manifest.textures))
      this.load.image(k, "assets/" + p);
    this.load.once("complete", () => this.ready());
    this.load.start();
  }
  ready() {
    for (const k of Object.keys(this.manifest.textures))
      this.images[k] = this.textures
        .get(k)
        .getSourceImage() as HTMLImageElement;
    this.texture = this.textures.createCanvas("view", 1400, 800)!;
    this.ctx = this.texture.context;
    this.add.image(0, 0, "view").setOrigin(0);
    this.actors = [
      "SunFlower",
      "PeaShooterSingle",
      "Wallnut",
      "SnowPea",
      "Zombie",
      "Zombie",
      "Zombie",
    ].map(
      (k, i) =>
        new Reanim(
          this.manifest.animations[k],
          k,
          i === 5 ? "cone" : i === 6 ? "bucket" : "normal",
        ),
    );
    this.input.keyboard!.on("keydown", (e: KeyboardEvent) => {
      if (e.code === "KeyG") location.search = "";
      if (e.code === "KeyH")
        for (const a of this.actors) {
          a.damage = (a.damage + 1) % 3;
          a.hurt = 0.5;
        }
      if (e.code === "KeyI")
        for (const a of this.actors)
          a.play(a.data.clips.anim_full_idle ? "anim_full_idle" : "anim_idle");
      if (e.code === "Space") this.paused = !this.paused;
      if (e.code === "ArrowRight") {
        for (const a of this.actors) a.update(1 / 12);
      }
      if (e.code === "KeyW" || e.code === "KeyE" || e.code === "KeyD")
        for (const a of this.actors.filter((a) => a.kind === "Zombie"))
          a.play(
            e.code === "KeyW"
              ? "anim_walk"
              : e.code === "KeyE"
                ? "anim_eat"
                : "anim_death",
            e.code === "KeyD",
          );
      if (e.code === "KeyS")
        for (const a of this.actors.filter((a) => a.data.clips.anim_shooting))
          a.play("anim_shooting", true);
    });
    (window as any).viewer = this;
  }
  update(_t: number, ms: number) {
    if (!this.ctx) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastTick) / 1000, 0.25);
    this.lastTick = now;
    const c = this.ctx;
    c.fillStyle = "#182c28";
    c.fillRect(0, 0, 1400, 800);
    c.fillStyle = "#fff0bf";
    c.font = "bold 34px Arial";
    c.fillText("REANIM LAB / Kiểm chứng nhân vật", 45, 60);
    c.font = "18px Arial";
    c.fillStyle = "#b3c8b9";
    c.fillText(
      "Space: dừng • →: một frame • W: đi • E: ăn • D: chết • S: bắn • I: idle • H: tổn thương • G: về game",
      45,
      100,
    );
    this.actors.forEach((a, i) => {
      if (!this.paused) a.update(dt);
      const x = 110 + i * 195;
      c.strokeStyle = "#537061";
      c.beginPath();
      c.moveTo(x - 85, 530);
      c.lineTo(x + 85, 530);
      c.stroke();
      a.draw(c, this.images, x, 530, 2);
      c.fillStyle = "#fff0bf";
      c.font = "18px Arial";
      c.fillText(i < 4 ? a.kind : a.variant, x - 75, 590);
      c.font = "14px monospace";
      c.fillStyle = "#b3c8b9";
      c.fillText(a.clip, x - 75, 620);
      c.fillText("12 fps · " + a.data.tracks.length + " tracks", x - 75, 650);
      c.fillText(
        "frame " +
          (
            a.range.start +
            Math.min(a.duration, a.time % a.duration) * a.data.fps
          ).toFixed(1),
        x - 75,
        676,
      );
    });
    this.texture.refresh();
  }
}
new Phaser.Game({
  type: Phaser.CANVAS,
  parent: "game",
  width: 1400,
  height: 800,
  backgroundColor: "#101b18",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: location.search.includes("viewer") ? Viewer : Duel,
});
