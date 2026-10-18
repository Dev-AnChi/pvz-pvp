import { Battle } from './combat';
import type { Duel } from './scene';
type Session = { code: string; token: string; role: 'plants' | 'zombies' };
export class Online {
  session: Session | null = null;
  connected = false;
  revision = -1;
  panel = document.createElement('section');
  status!: HTMLElement;
  constructor(private scene: Duel) {
    this.panel.id = 'online';
    this.panel.innerHTML = `<details open><summary>CHƠI ONLINE VỚI BẠN BÈ</summary><div class="room-controls"><button id="create-room">Tạo phòng</button><input id="room-code" aria-label="Mã phòng" placeholder="Mã phòng" maxlength="8"><button id="join-room">Vào phòng</button><button id="copy-room" hidden>Sao chép link mời</button><button id="start-room" hidden>Bắt đầu / Chơi lại</button><button id="leave-room" hidden>Rời phòng</button></div><p id="room-status" role="status">Chủ phòng chơi cây, bạn tham gia chơi zombie.</p></details>`;
    document.body.append(this.panel);
    this.status = this.panel.querySelector('#room-status')!;
    this.panel.addEventListener('keydown', e => e.stopPropagation());
    const input = this.panel.querySelector<HTMLInputElement>('#room-code')!;
    input.value = new URLSearchParams(location.search).get('room') || '';
    this.button('create-room').onclick = () => void this.enter('create');
    this.button('join-room').onclick = () => void this.enter('join', input.value.trim().toUpperCase());
    this.button('start-room').onclick = () => this.action('start');
    this.button('leave-room').onclick = async () => { try { await this.request('leave'); } catch {} this.clear(); location.reload(); };
    this.button('copy-room').onclick = async () => {
      const url = new URL(location.href); url.search = ''; url.searchParams.set('room', this.session!.code);
      try { await navigator.clipboard.writeText(url.href); this.status.textContent = 'Đã sao chép link mời.'; }
      catch { this.status.textContent = 'Link mời: ' + url.href; }
    };
    try { this.session = JSON.parse(sessionStorage.getItem('pvz-room') || 'null'); } catch {}
    this.refresh();
    void this.poll();
  }
  button(id: string) { return this.panel.querySelector<HTMLButtonElement>('#' + id)!; }
  refresh() {
    for (const id of ['create-room', 'join-room']) this.button(id).hidden = !!this.session;
    this.panel.querySelector<HTMLInputElement>('#room-code')!.hidden = !!this.session;
    for (const id of ['copy-room', 'leave-room']) this.button(id).hidden = !this.session;
    this.button('start-room').hidden = this.session?.role !== 'plants';
  }
  clear() { this.session = null; this.connected = false; sessionStorage.removeItem('pvz-room'); this.refresh(); }
  async request(endpoint: string, data?: object, get = false) {
    const response = await fetch('/api/' + endpoint + (get ? '?code=' + this.session!.code : ''), {
      method: get ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (this.session?.token || '') },
      body: get ? undefined : JSON.stringify({ code: this.session?.code, ...data }), signal: AbortSignal.timeout(5000),
    });
    const result = await response.json();
    if (!response.ok) { if (get && [401, 404].includes(response.status)) this.clear(); throw new Error(result.error); }
    return result;
  }
  async enter(endpoint: string, code?: string) {
    this.button('create-room').disabled = this.button('join-room').disabled = true;
    try {
      this.session = await this.request(endpoint, { code });
      sessionStorage.setItem('pvz-room', JSON.stringify(this.session));
      this.scene.started = false; this.scene.battle = new Battle(); this.scene.actors.clear(); this.scene.fx = [];
      this.revision = -1; this.refresh();
    } catch (e) { this.status.textContent = 'Không thể vào phòng: ' + (e as Error).message + ' (Hãy chạy START_GAME.cmd.)'; }
    finally { this.button('create-room').disabled = this.button('join-room').disabled = false; }
  }
  action(action: string, data: object = {}) {
    void this.request('action', { action, ...data }).catch(e => { this.status.textContent = e.message; });
  }
  async poll() {
    if (this.session) {
      try {
        const state = await this.request('state', undefined, true);
        if (!this.session) return;
        this.connected = state.connected;
        if (state.revision !== this.revision) { this.scene.actors.clear(); this.scene.fx = []; this.revision = state.revision; }
        Object.assign(this.scene.battle, state.battle, { events: [...this.scene.battle.events, ...state.battle.events], paused: state.battle.paused || !state.connected });
        this.scene.started = state.started;
        this.button('start-room').disabled = !state.connected || (state.started && !state.battle.winner);
        this.panel.querySelector('summary')!.textContent = `PHÒNG ${this.session.code} · BẠN: ${this.session.role === 'plants' ? 'CÂY' : 'ZOMBIE'} · ${state.connected ? 'Đã kết nối' : 'Đang chờ bạn'}`;
        this.status.textContent = !state.connected ? 'Chờ người chơi còn lại kết nối. Trận đấu tự dừng khi mất kết nối.' : !state.started ? 'Đủ hai người. Chủ phòng nhấn Bắt đầu.' : 'Trận đấu đồng bộ qua máy chủ. Có thể thu gọn bảng này.';
      } catch (e) { this.connected = false; this.scene.battle.paused = true; this.status.textContent = 'Mất kết nối: ' + (e as Error).message; }
    }
    setTimeout(() => void this.poll(), 100);
  }
}
