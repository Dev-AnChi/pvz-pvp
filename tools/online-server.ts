import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { Battle, type Event } from '../src/combat';
import { CONFIG } from '../src/config';
type Player = { token: string; seen: number; events: Event[] };
type Room = { battle: Battle; players: Player[]; started: boolean; revision: number; touched: number };
const rooms = new Map<string, Room>();
const root = path.resolve('dist');
const token = () => randomBytes(24).toString('hex');
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.ogg': 'audio/ogg' };
const server = http.createServer(async (req, res) => {
  const reply = (status: number, data: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
  try {
    const url = new URL(req.url!, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD') return reply(405, { error: 'Method not allowed' });
      const file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if (!file.startsWith(root + path.sep)) return reply(403, { error: 'Forbidden' });
      const data = await fs.promises.readFile(file);
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
      res.end(req.method === 'HEAD' ? undefined : data); return;
    }
    if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return reply(403, { error: 'Origin rejected' });
    let body: any = {};
    if (req.method === 'POST') {
      let raw = '';
      for await (const chunk of req) { raw += chunk; if (raw.length > 2048) return reply(413, { error: 'Request too large' }); }
      body = JSON.parse(raw || '{}');
      if (!body || typeof body !== 'object') return reply(400, { error: 'Invalid request' });
    }
    if (url.pathname === '/api/create' && req.method === 'POST') {
      if (rooms.size >= 500) return reply(503, { error: 'Máy chủ đầy, thử lại sau.' });
      let code: string; do { code = randomBytes(4).toString('hex').toUpperCase(); } while (rooms.has(code));
      const player = { token: token(), seen: Date.now(), events: [] as Event[] };
      rooms.set(code, { battle: new Battle(), players: [player], started: false, revision: 0, touched: Date.now() });
      return reply(200, { code, token: player.token, role: 'plants' });
    }
    const code = String(body.code || url.searchParams.get('code') || '').toUpperCase();
    const room = rooms.get(code);
    if (!room) return reply(404, { error: 'Không tìm thấy phòng hoặc phòng đã hết hạn.' });
    if (url.pathname === '/api/join' && req.method === 'POST') {
      if (room.players.length === 2) return reply(409, { error: 'Phòng đã đủ hai người.' });
      const player = { token: token(), seen: Date.now(), events: [] as Event[] }; room.players.push(player); room.touched = Date.now();
      return reply(200, { code, token: player.token, role: 'zombies' });
    }
    const seat = room.players.findIndex(p => p.token === req.headers.authorization?.replace(/^Bearer /, ''));
    if (seat < 0) return reply(401, { error: 'Phiên chơi không hợp lệ.' });
    room.players[seat].seen = room.touched = Date.now();
    const connected = room.players.length === 2 && room.players.every(p => Date.now() - p.seen < 5000);
    if (url.pathname === '/api/state' && req.method === 'GET') { const events = room.players[seat].events.splice(0); return reply(200, { battle: { ...room.battle, events }, started: room.started, connected, revision: room.revision }); }
    if (url.pathname === '/api/leave' && req.method === 'POST') { rooms.delete(code); return reply(200, {}); }
    if (url.pathname !== '/api/action' || req.method !== 'POST') return reply(404, { error: 'Not found' });
    const b = room.battle; let ok = false;
    if (body.action === 'start' && seat === 0 && connected && (!room.started || b.winner)) {
      room.battle = new Battle(); room.started = true; room.revision++; room.players.forEach(p => p.events = []); ok = true;
    } else if (room.started && connected) {
      if (body.action === 'pause' && !b.winner) { b.paused = !b.paused; ok = true; }
      if (Number.isInteger(body.type) && Number.isInteger(body.row)) {
        if (body.action === 'plant' && seat === 0 && Number.isInteger(body.col)) ok = b.place(body.type, body.row, body.col);
        if (body.action === 'spawn' && seat === 1) ok = b.spawn(body.type, body.row);
      }
    }
    reply(ok ? 200 : 409, { error: ok ? undefined : 'Chưa thể thực hiện: kiểm tra phe, tài nguyên, hồi chiêu và trạng thái phòng.' });
  } catch (err: any) { reply(err.code === 'ENOENT' ? 404 : 400, { error: 'Yêu cầu không hợp lệ.' }); }
});
let previous = performance.now(), accumulator = 0;
setInterval(() => {
  const now = performance.now(); accumulator += Math.min((now - previous) / 1000, .25); previous = now;
  const steps = Math.floor(accumulator / CONFIG.step); accumulator -= steps * CONFIG.step;
  for (const [code, room] of rooms) {
    if (Date.now() - room.touched > 30 * 60_000) { rooms.delete(code); continue; }
    if (room.started && room.players.every(p => Date.now() - p.seen < 5000)) for (let i = 0; i < steps; i++) room.battle.step(CONFIG.step);
    const events = room.battle.drain();
    for (const player of room.players) player.events = [...player.events, ...events].slice(-200);
  }
}, CONFIG.step * 1000).unref();
server.listen(Number(process.env.PORT || 4173), process.env.HOST || '0.0.0.0', () => console.log(`PvZ online: http://localhost:${process.env.PORT || 4173}`));
