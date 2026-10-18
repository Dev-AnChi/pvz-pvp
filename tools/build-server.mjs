import { build } from 'vite';
await build({ configFile: false, build: { ssr: 'tools/online-server.ts', outDir: 'build', target: 'node20', rollupOptions: { output: { entryFileNames: 'server.mjs' } } } });
