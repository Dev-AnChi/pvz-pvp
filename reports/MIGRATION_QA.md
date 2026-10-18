# Repository migration QA

UI destination: C:\Data\ui-game-discord-vo-tri\FE
Backend destination: C:\Data\bot-game-discord-vo-tri\pvz
Backup: C:\Data\pvz-pvp\build\migration-backup-20261018-222540

- Replaced old UI repository working files, preserving .git/remote.
- Preserved bot Python source; added PvZ service and updated deployment configuration.
- Frontend production build PASS at destination.
- Backend TypeScript/production build PASS at destination.
- Existing combat/Reanim tests: 10 PASS at frontend destination.
- API integration at backend destination: PASS.
- Two Edge sessions using frontend Vite proxy and backend from separate repositories: PASS create/join/start, synchronized plant/zombie inputs, reload restores guest seat, no uncaught page errors.
- Fixed Vite proxy to preserve Host header for same-origin checks. Nginx config likewise preserves Host.
- SHA256 of combat.ts and config.ts matches between both repositories.
- Docker and cross-container routing were not run locally (Docker unavailable). Host SSH connection previously timed out. Nothing pushed or deployed live.
- Deployment requires updating compose/deploy files on host for both repos and sharing vo-tri-game network. Existing UI service fe/image/port 5223 retained.
