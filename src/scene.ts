// UTF-8 — Phaser owns timing, input, scaling, assets and sound.
import Phaser from "phaser";
import { Reanim, type Manifest } from "./reanim";
import { Battle, type Event } from "./combat";
import { CONFIG as C, cellX, laneY } from "./config";
type Effect = { type: string; x: number; y: number; life: number; max: number };
export class Duel extends Phaser.Scene {
  manifest!: Manifest;
  images: Record<string, HTMLImageElement> = {};
  texture!: Phaser.Textures.CanvasTexture;
  ctx!: CanvasRenderingContext2D;
  battle = new Battle();
  actors = new Map<number, Reanim>();
  icons: Reanim[] = [];
  fx: Effect[] = [];
  plant = 1;
  zombie = 0;
  hover = { x: -1, y: -1 };
  cursor = { row: 2, col: 0 };
  accumulator = 0;
  started = false;
  muted = false;
  zoom = 1;
  lastTick = performance.now();
  notice = "";
  noticeTime = 0;
  lastAudio: Record<string, number> = {};
  preload() {
    this.load.json("manifest", "assets/manifest.json");
  }
  create() {
    this.manifest = this.cache.json.get("manifest");
    for (const [k, p] of Object.entries(this.manifest.textures))
      this.load.image(k, "assets/" + p);
    for (const [k, p] of Object.entries(this.manifest.audio))
      this.load.audio(k, "assets/" + p);
    this.load.once("complete", () => this.ready());
    this.load.start();
  }
  ready() {
    for (const k of Object.keys(this.manifest.textures))
      this.images[k] = this.textures
        .get(k)
        .getSourceImage() as HTMLImageElement;
    this.texture = this.textures.createCanvas("duel", 1400, 800)!;
    this.ctx = this.texture.context;
    this.add.image(0, 0, "duel").setOrigin(0);
    this.icons = [
      ...C.plants.map(
        (p) => new Reanim(this.manifest.animations[p.model], p.model),
      ),
      ...C.zombies.map(
        (z) => new Reanim(this.manifest.animations.Zombie, "Zombie", z.id),
      ),
    ];
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      this.hover = { x: p.x, y: p.y };
    });
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) =>
      this.click(p.x, p.y),
    );
    this.input.keyboard!.addCapture(["SPACE", "UP", "DOWN", "LEFT", "RIGHT"]);
    this.input.keyboard!.on("keydown", (e: KeyboardEvent) => this.key(e));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.started && !this.battle.winner)
        this.battle.paused = true;
      this.lastTick = performance.now();
    });
    (window as any).duel = this;
  }
  reset() {
    this.battle = new Battle();
    this.actors.clear();
    this.fx = [];
    this.accumulator = 0;
    this.started = true;
    this.notice = "Bảo vệ sân nhà trong 3 phút. Zombie cần 5 lần đột nhập.";
    this.noticeTime = 5;
  }
  key(e: KeyboardEvent) {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === "enter" && !this.started) {
      this.reset();
      return;
    }
    if (k === "n") {
      this.reset();
      return;
    }
    if (k === " ") {
      if (this.started && !this.battle.winner)
        this.battle.paused = !this.battle.paused;
      this.noticeTime = 0;
      return;
    }
    if (k === "m") {
      this.muted = !this.muted;
      return;
    }
    if (k === "v") {
      location.search = "viewer";
      return;
    }
    if (k === "-" || k === "=" || k === "+") {
      this.setZoom(k === "-" ? -0.1 : 0.1);
      return;
    }
    if ("1234".includes(k) && k.length === 1) this.plant = Number(k) - 1;
    if ("789".includes(k) && k.length === 1) this.zombie = Number(k) - 7;
    if (!this.started) return;
    const row = "qwert".indexOf(k);
    if (row >= 0 && k.length === 1) this.trySpawn(row);
    if (e.code === "ArrowUp")
      this.cursor.row = Math.max(0, this.cursor.row - 1);
    if (e.code === "ArrowDown")
      this.cursor.row = Math.min(4, this.cursor.row + 1);
    if (e.code === "ArrowLeft")
      this.cursor.col = Math.max(0, this.cursor.col - 1);
    if (e.code === "ArrowRight")
      this.cursor.col = Math.min(8, this.cursor.col + 1);
    if (k === "enter") this.tryPlant(this.cursor.row, this.cursor.col);
  }
  setZoom(delta: number) {
    this.zoom = Phaser.Math.Clamp(this.zoom + delta, 0.65, 1);
    const el = document.getElementById("game")!;
    el.style.width = this.zoom * 100 + "vw";
    el.style.height = this.zoom * 100 + "vh";
    this.scale.refresh();
  }
  click(x: number, y: number) {
    if (!this.started) {
      if (x > 490 && x < 910 && y > 565 && y < 635) this.reset();
      return;
    }
    if (y > 748) {
      if (x > 1140 && x < 1210) this.setZoom(-0.1);
      else if (x >= 1210 && x < 1280) this.setZoom(0.1);
      else if (x > 1280) this.muted = !this.muted;
      else if (x > 960 && x < 1130) location.search = "viewer";
      return;
    }
    if (this.battle.winner) {
      if (y > 430 && y < 510) this.reset();
      return;
    }
    if (x > 1270 && y < 65) {
      this.battle.paused = !this.battle.paused;
      this.noticeTime = 0;
      return;
    }
    if (y >= 28 && y <= 134) {
      if (x >= 215 && x < 655)
        this.plant = Math.min(3, Math.floor((x - 215) / 110));
      if (x >= 800 && x < 1130)
        this.zombie = Math.min(2, Math.floor((x - 800) / 110));
      return;
    }
    const row = Math.floor((y - C.grid.y) / C.grid.h);
    if (row >= 0 && row < 5) {
      if (x >= C.grid.x && x < C.grid.x + 720)
        this.tryPlant(row, Math.floor((x - C.grid.x) / 80));
      if (x >= 1000 && x < 1190) this.trySpawn(row);
    }
  }
  tryPlant(row: number, col: number) {
    if (!this.battle.place(this.plant, row, col)) {
      this.notice = this.battle.paused
        ? "Trận đấu đang tạm dừng."
        : "Chưa thể trồng: kiểm tra mặt trời, hồi chiêu hoặc ô đã có cây.";
      this.noticeTime = 2;
    }
    this.cursor = { row, col };
  }
  trySpawn(row: number) {
    if (!this.battle.spawn(this.zombie, row)) {
      this.notice = this.battle.paused
        ? "Trận đấu đang tạm dừng."
        : "Chưa thể thả: kiểm tra số não và hồi chiêu.";
      this.noticeTime = 2;
    }
  }
  audio(key: string) {
    if (this.muted) return;
    const now = this.time.now;
    if (now - (this.lastAudio[key] ?? -999) < 120) return;
    this.lastAudio[key] = now;
    this.sound.play(key, { volume: key === "groan" ? 0.18 : 0.24 });
  }
  event(e: Event) {
    const map: Record<string, string> = {
      plant: "plant",
      spawn: "groan",
      shot: "throw",
      hit: "splat",
      sun: "points",
      bite: "chomp",
    };
    if (map[e.type]) this.audio(map[e.type]);
    if (e.type === "end")
      this.audio(this.battle.winner === "plants" ? "winmusic" : "losemusic");
    if (["plant", "hit", "sun", "breach", "kill"].includes(e.type))
      this.fx.push({
        type: e.type,
        x: e.x,
        y: laneY(e.row) - (e.type === "plant" ? 5 : 55),
        life: e.type === "sun" ? 1.3 : 0.5,
        max: e.type === "sun" ? 1.3 : 0.5,
      });
    if (e.type === "shot" && e.uid)
      this.actors.get(e.uid)?.play("anim_shooting", true);
  }
  update(_time: number, ms: number) {
    if (!this.ctx) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastTick) / 1000, 0.25);
    this.lastTick = now;
    if (this.started && !this.battle.paused && !this.battle.winner) {
      this.accumulator += dt;
      while (this.accumulator >= C.step) {
        this.battle.step(C.step);
        this.accumulator -= C.step;
      }
    }
    const live = new Set<number>();
    for (const p of this.battle.plants) {
      live.add(p.uid);
      if (!this.actors.has(p.uid)) {
        const model = C.plants[p.type].model;
        this.actors.set(
          p.uid,
          new Reanim(this.manifest.animations[model], model),
        );
      }
    }
    for (const z of this.battle.zombies) {
      live.add(z.uid);
      if (!this.actors.has(z.uid))
        this.actors.set(
          z.uid,
          new Reanim(
            this.manifest.animations.Zombie,
            "Zombie",
            C.zombies[z.type].id,
          ),
        );
      const a = this.actors.get(z.uid)!;
      a.play("anim_" + z.action, z.action === "death");
      a.armor = z.hp > 200;
      const armorRatio = (z.hp - 200) / Math.max(1, C.zombies[z.type].hp - 200);
      a.damage = armorRatio < 0.33 ? 2 : armorRatio < 0.66 ? 1 : 0;
      a.hurt = z.hurt;
    }
    for (const id of this.actors.keys())
      if (!live.has(id)) this.actors.delete(id);
    for (const e of this.battle.drain()) this.event(e);
    if (!this.battle.paused && !this.battle.winner) {
      for (const a of this.actors.values()) {
        if (a.finished && a.kind !== "Zombie")
          a.play(a.data.clips.anim_full_idle ? "anim_full_idle" : "anim_idle");
        a.update(dt);
      }
      for (const f of this.fx) f.life -= dt;
      this.fx = this.fx.filter((f) => f.life > 0);
      this.noticeTime = Math.max(0, this.noticeTime - dt);
    }
    for (const a of this.icons) a.update(dt);
    this.draw();
    this.texture.refresh();
  }
  text(
    s: string,
    x: number,
    y: number,
    size = 18,
    color = "#f8edc9",
    align: CanvasTextAlign = "left",
    bold = false,
  ) {
    const c = this.ctx;
    c.fillStyle = color;
    c.font = `${bold ? "bold " : ""}${size}px "Trebuchet MS", Arial, sans-serif`;
    c.textAlign = align;
    c.textBaseline = "middle";
    c.fillText(s, x, y);
  }
  box(
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    stroke?: string,
    r = 8,
  ) {
    const c = this.ctx;
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    c.fillStyle = fill;
    c.fill();
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = 2;
      c.stroke();
    }
  }
  picture(key: string, x: number, y: number, w: number, h: number) {
    const img = this.images[key];
    if (!img) return;
    const s = Math.min(w / img.width, h / img.height);
    this.ctx.drawImage(
      img,
      x + (w - img.width * s) / 2,
      y + (h - img.height * s) / 2,
      img.width * s,
      img.height * s,
    );
  }
  draw() {
    const c = this.ctx;
    c.clearRect(0, 0, 1400, 800);
    c.drawImage(this.images.background, 0, 140);
    c.fillStyle = "#172b25";
    c.fillRect(0, 0, 1400, 140);
    c.fillStyle = "#b4a16b";
    c.fillRect(0, 137, 1400, 3);
    this.text("PvZ", 27, 36, 32, "#e6d48a", "left", true);
    this.text("DUEL", 96, 36, 32, "#8fc477", "left", true);
    this.text("SÂN NHÀ ĐẠI CHIẾN", 28, 66, 12, "#a4b9a0");
    this.picture("sun", 25, 83, 35, 35);
    this.text(
      String(Math.floor(this.battle.sun)),
      66,
      103,
      26,
      "#ffe88d",
      "left",
      true,
    );
    this.text("NGƯỜI 1 / CÂY", 215, 16, 12, "#aad692", "left", true);
    this.text("NGƯỜI 2 / ZOMBIE", 800, 16, 12, "#e5b5a0", "left", true);
    this.picture("brain", 683, 56, 52, 42);
    this.text(
      String(Math.floor(this.battle.brain)),
      710,
      115,
      24,
      "#f1c3ad",
      "center",
      true,
    );
    C.plants.forEach((p, i) =>
      this.card(
        i,
        215 + i * 110,
        p.name,
        p.cost,
        this.battle.pcd[i],
        p.cooldown,
        this.battle.sun,
        this.plant === i,
        String(i + 1),
      ),
    );
    C.zombies.forEach((z, i) =>
      this.card(
        i + 4,
        800 + i * 110,
        z.name,
        z.cost,
        this.battle.zcd[i],
        z.cooldown,
        this.battle.brain,
        this.zombie === i,
        String(i + 7),
      ),
    );
    const remaining = Math.max(0, Math.ceil(C.duration - this.battle.time));
    this.text(
      `${Math.floor(remaining / 60)
        .toString()
        .padStart(2, "0")}:${(remaining % 60).toString().padStart(2, "0")}`,
      1190,
      43,
      34,
      "#f7e6b0",
      "center",
      true,
    );
    this.text(
      `Đột nhập ${this.battle.breaches} / ${C.breachesToWin}`,
      1220,
      91,
      18,
    );
    this.box(1285, 20, 90, 42, "#304a3d", "#78906e");
    this.text(
      this.battle.paused ? "TIẾP" : "DỪNG",
      1330,
      42,
      14,
      "#eee5c4",
      "center",
      true,
    );
    this.text("SPACE", 1330, 77, 11, "#a7b7a3", "center");
    this.box(1140, 168, 225, 108, "#172b25e8", "#a19a69");
    this.text("CỬA NGÕ ZOMBIE", 1252, 192, 17, "#f2d59b", "center", true);
    this.text("7–9 chọn quân", 1252, 220, 16, "#d0d8bd", "center");
    this.text("Q W E R T → hàng 1–5", 1252, 247, 15, "#d0d8bd", "center");
    for (let row = 0; row < 5; row++) {
      this.box(1022, C.grid.y + row * 100 + 31, 58, 36, "#403b2bcc", "#b9aa76");
      this.text(
        "QWERT"[row],
        1051,
        C.grid.y + row * 100 + 50,
        20,
        "#f5e5be",
        "center",
        true,
      );
    }
    if (this.started && !this.battle.winner && !this.battle.paused) {
      const r = Math.floor((this.hover.y - C.grid.y) / 100),
        col = Math.floor((this.hover.x - C.grid.x) / 80);
      if (r >= 0 && r < 5 && col >= 0 && col < 9) {
        const x = C.grid.x + col * 80,
          y = C.grid.y + r * 100;
        c.fillStyle = "#fbffbc25";
        c.fillRect(x, y, 80, 100);
        c.strokeStyle = "#f5e89b";
        c.lineWidth = 2;
        c.strokeRect(x + 2, y + 2, 76, 96);
        this.icons[this.plant].draw(
          c,
          this.images,
          cellX(col),
          laneY(r),
          1.3,
          0.42,
        );
      }
      c.strokeStyle = "#f6eab480";
      c.lineWidth = 1;
      c.strokeRect(
        C.grid.x + this.cursor.col * 80 + 5,
        C.grid.y + this.cursor.row * 100 + 5,
        70,
        90,
      );
    }
    for (let row = 0; row < 5; row++) {
      for (const p of this.battle.plants.filter((p) => p.row === row)) {
        this.shadow(p.x, laneY(row), 26);
        const a = this.actors.get(p.uid)!;
        a.hurt = p.hurt;
        a.damage = p.type === 2 ? (p.hp < 400 ? 2 : p.hp < 800 ? 1 : 0) : 0;
        a.draw(c, this.images, p.x, laneY(row), 1.3);
        if (p.hp < C.plants[p.type].hp)
          this.hp(p.x, laneY(row) + 8, p.hp / C.plants[p.type].hp, "#82d65a");
      }
      for (const z of this.battle.zombies
        .filter((z) => z.row === row)
        .sort((a, b) => a.x - b.x)) {
        this.shadow(z.x, laneY(row), 23);
        const a = this.actors.get(z.uid)!;
        a.frozen = z.slow > 0;
        a.draw(
          c,
          this.images,
          z.x,
          laneY(row),
          1.1,
          z.hp <= 0 ? Math.min(1, z.death / 0.5) : 1,
        );
        if (z.hp > 0 && z.hp < C.zombies[z.type].hp)
          this.hp(
            z.x,
            laneY(row) + 8,
            z.hp / C.zombies[z.type].hp,
            z.slow > 0 ? "#8fdef0" : "#e6a36d",
          );
      }
      for (const s of this.battle.shots.filter((s) => s.row === row))
        this.picture(s.ice ? "ice" : "pea", s.x - 12, laneY(row) - 67, 24, 24);
    }
    for (const f of this.fx) {
      const t = f.life / f.max;
      c.save();
      c.globalAlpha = Math.min(1, t * 2);
      if (f.type === "sun") {
        this.picture("sun", f.x - 20, f.y - (1 - t) * 45, 40, 40);
        this.text(
          "+25",
          f.x + 22,
          f.y + 16 - (1 - t) * 45,
          18,
          "#fff19b",
          "left",
          true,
        );
      } else if (f.type === "hit") {
        this.picture("splat", f.x - 22, f.y - 25, 44, 44);
      } else if (f.type === "plant") {
        const dust = this.images.dust;
        const frameW = dust.height;
        c.drawImage(dust, 0, 0, frameW, frameW, f.x - 35, f.y - 24, 70, 35);
      } else if (f.type === "breach") {
        this.text("ĐỘT NHẬP!", f.x, f.y, 23, "#ffd2bd", "center", true);
      }
      c.restore();
    }
    c.fillStyle = "#172b25";
    c.fillRect(0, 740, 1400, 60);
    c.fillStyle = "#b4a16b";
    c.fillRect(0, 740, 1400, 2);
    this.text(
      this.noticeTime > 0
        ? this.notice
        : "1–4 chọn cây · Bấm ô cỏ / mũi tên + Enter · 7–9 chọn zombie · Q W E R T thả quân",
      25,
      763,
      16,
      "#dfdfc6",
    );
    this.text(
      "Phòng thủ 3 phút  /  5 lần đột nhập  •  N: ván mới",
      25,
      787,
      12,
      "#91a78f",
    );
    this.text("REANIM LAB", 1043, 772, 14, "#d6c78b", "center", true);
    this.text("−", 1170, 771, 27);
    this.text("+", 1240, 771, 25);
    this.text(
      this.muted ? "ÂM: TẮT" : "ÂM: BẬT",
      1330,
      771,
      14,
      "#d6c78b",
      "center",
      true,
    );
    if (!this.started) this.title();
    else if (this.battle.paused || this.battle.winner) this.overlay();
  }
  shadow(x: number, y: number, w: number) {
    const c = this.ctx;
    c.fillStyle = "#18371340";
    c.beginPath();
    c.ellipse(x, y, w, 7, 0, 0, Math.PI * 2);
    c.fill();
  }
  hp(x: number, y: number, ratio: number, color: string) {
    this.box(x - 24, y, 48, 5, "#1e291a");
    this.box(x - 23, y + 1, 46 * Math.max(0, ratio), 3, color, undefined, 1);
  }
  card(
    index: number,
    x: number,
    name: string,
    cost: number,
    cd: number,
    max: number,
    resource: number,
    selected: boolean,
    key: string,
  ) {
    const c = this.ctx;
    this.box(
      x,
      30,
      100,
      103,
      selected ? "#f7dfa1" : "#bcbd92",
      selected ? "#fff1a5" : "#738368",
      5,
    );
    c.save();
    c.beginPath();
    c.rect(x + 2, 32, 96, 99);
    c.clip();
    c.drawImage(this.images.packet, x, 30, 100, 103);
    this.box(x + 5, 34, 90, 20, "#e6e5b4", undefined, 2);
    this.box(x + 5, 110, 90, 20, "#e6e5b4", undefined, 2);
    this.icons[index].draw(
      c,
      this.images,
      x + 50,
      105,
      index >= 4 ? 0.56 : 0.85,
    );
    if (cd > 0) {
      c.fillStyle = "#14231ec0";
      c.fillRect(x + 2, 32, 96, (99 * cd) / max);
    } else if (resource < cost) {
      c.fillStyle = "#14231e80";
      c.fillRect(x + 2, 32, 96, 99);
    }
    c.restore();
    this.box(x + 4, 34, 20, 20, "#283b26");
    this.text(key, x + 14, 44, 13, "#fff4ca", "center", true);
    this.text(name, x + 50, 120, 12, "#293421", "center", true);
    this.text(
      String(cost),
      x + 77,
      44,
      14,
      cd > 0 ? "#ffe6a2" : "#283b26",
      "center",
      true,
    );
    if (cd > 0) {
      this.box(x + 24, 77, 52, 24, "#14231ee0", undefined, 4);
      this.text(cd.toFixed(1) + "s", x + 50, 89, 14, "#ffe6a2", "center", true);
    }
  }
  title() {
    const c = this.ctx;
    c.fillStyle = "#0b17156e";
    c.fillRect(0, 140, 1400, 600);
    this.box(365, 220, 670, 440, "#172b25f5", "#b5a36a", 18);
    this.text("PLANTS vs. ZOMBIES", 700, 267, 20, "#9dbd8b", "center", true);
    this.text("SÂN NHÀ ĐẠI CHIẾN", 700, 316, 40, "#f2dda1", "center", true);
    this.text("Hai người. Một khu vườn.", 700, 360, 23, "#dce2c8", "center");
    this.icons[1].draw(c, this.images, 465, 520, 1.7);
    this.icons[5].draw(c, this.images, 938, 520, 1.2);
    this.text("CÂY", 700, 410, 17, "#b7df8f", "center", true);
    this.text("Giữ sân trong 3 phút", 700, 438, 19, "#e4e7d6", "center");
    this.text("ZOMBIE", 700, 480, 17, "#e9b39a", "center", true);
    this.text("Đột nhập 5 lần để thắng", 700, 508, 19, "#e4e7d6", "center");
    this.box(490, 565, 420, 62, "#d8bc6b", "#f4dda0", 8);
    this.text("BẮT ĐẦU TRẬN ĐẤU", 700, 596, 23, "#253522", "center", true);
    this.text(
      "Enter để bắt đầu · V mở animation viewer",
      700,
      645,
      14,
      "#aabda5",
      "center",
    );
  }
  overlay() {
    const c = this.ctx;
    c.fillStyle = "#09140fb8";
    c.fillRect(0, 140, 1400, 600);
    const b = this.battle;
    this.box(400, 300, 600, 220, "#1c332af5", "#b6a36c", 15);
    this.text(
      b.winner
        ? b.winner === "plants"
          ? "SÂN NHÀ AN TOÀN!"
          : "ZOMBIE CHIẾN THẮNG!"
        : "TẠM DỪNG",
      700,
      348,
      31,
      "#f4dda3",
      "center",
      true,
    );
    this.text(
      b.winner
        ? `${b.kills} zombie bị hạ · ${b.breaches} lần đột nhập`
        : "Space hoặc DỪNG / TIẾP để tiếp tục",
      700,
      398,
      21,
      "#d4ddc4",
      "center",
    );
    if (b.winner) {
      this.box(520, 441, 360, 52, "#d8bc6b");
      this.text("CHƠI LẠI · N", 700, 467, 22, "#263b28", "center", true);
    }
  }
}
