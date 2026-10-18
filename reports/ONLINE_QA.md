# Online QA — 2026-10-18

- Production build and TypeScript check: PASS.
- Existing combat/Reanim tests: 10 PASS.
- API integration: PASS room capacity, host-only start, side permissions, invalid input, equal paused snapshots, pause, disconnect/reconnect and leave.
- Two isolated Edge browser sessions: PASS create/join/start, keyboard plant/zombie commands synchronized to both clients, refresh restores guest seat, no uncaught page errors.
- Fixed focus remaining in lobby controls after clicking the canvas.
- Visual screenshot checked: reports/online-host.png. Guest screenshot: reports/online-guest.png.
- Tests run against local port 4187. No public Internet deployment or WAN latency test has been performed. Docker configuration is supplied but not executed in this environment.
- Run npm run build, npm test, npm run test:online to reproduce (Edge installed; BROWSER_CHANNEL=chrome supported).
