Teaches the AI the exact workspace config and TypeScript rules so it never breaks cross-package imports.
pnpm workspaces: packages are client/ and server/ only
Root package.json scripts: dev (concurrently), build:server, build:client
server/ tsconfig: module CommonJS, target ES2022, strict true, outDir dist/
client/ tsconfig: extends Vite default, strict true
Shared TypeScript types live in server/src/types/ and are imported by client via VITE alias
Never import from client/ inside server/ or vice versa via relative paths — use workspace imports
All .env files in server/ — Vite env vars prefixed with VITE_ go in client/.env
Add .env to .gitignore — commit only .env.example with placeholder values