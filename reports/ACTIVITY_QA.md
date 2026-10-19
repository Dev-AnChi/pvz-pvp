# Activity and online lobby QA — 2026-10-19

Implemented in ui-game-discord-vo-tri/FE and bot-game-discord-vo-tri/pvz:
- Dedicated login/lobby/room flow; Enter cannot start a local game.
- Creator chooses plants or zombies; host privilege independent of faction.
- Both players ready before host starts; role permissions validated server-side.
- Own-faction cards/resources/inputs only. Both sides still see the shared battlefield.
- Discord Embedded App SDK 2.5.0: ready, authorize identify/prompt none, backend code exchange, SDK authenticate.
- Backend validates user through Discord API. Separate short-lived game session supports Activity without third-party cookies.
- /api/config protocol 2 detects old/wrong backend early; origin allowlist includes only configured app's Discord proxy origin.
- Room polling ignores stale responses after leave/rejoin, and keeps polling after returning to lobby.

Verified:
- FE and backend production builds and TypeScript checks passed.
- 10 existing combat/Reanim tests passed.
- Mock Activity SDK command sequence passed.
- Mock Discord web OAuth and Activity code/profile exchange, session expiry/logout passed.
- API tests passed, including zombie host / plant guest, readiness and wrong-side commands.
- Two Edge sessions passed: login as guests, lobby, no local match, selection, ready/start, role-only card rendering, correct keyboard actions, opponent commands blocked, synchronized state, reload, leave/create again, mobile no horizontal overflow.
- Screenshots inspected: FE/reports/create-room.png, online-zombies.png, lobby-mobile.png.
- Both repos' workflow/compose YAML parse; FE package-lock agrees with dependencies.

Live observations:
- https://vo-tri-fe.pan.io.vn/ returned 200 with old frontend bundle index-jSjrpMuB.js.
- /api/config and /api/auth/me returned 502, text/plain.
- SSH it@10.10.30.7 timed out again. Exact host-side container/network failure is not yet known.
- Changes remain local; no push, live deploy, live Discord consent flow or Docker networking test performed.

Operational configuration and diagnosis: bot-game-discord-vo-tri/pvz/ACTIVITY.md.
