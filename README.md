# BreakTrail — local full-stack application

Complete 24-screen React frontend plus a Node/Express + SQLite backend connected to local Qwen3 inference through Ollama.

| Part | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS v4 |
| Validation | Zod |
| Offline cache | vite-plugin-pwa |
| API | Node.js + Express |
| Database | SQLite through node:sqlite |
| Local AI | Ollama + qwen3:0.6b |

## Start here

Read [backend/README.md](backend/README.md) for the full Windows guide, environment variables, endpoint reference, Ollama instructions and troubleshooting.

Requires Node.js 22.13+ and Ollama. Install Ollama, then download the model:

```powershell
ollama pull qwen3:0.6b
ollama list
```

In one terminal from the project root:

```powershell
cd backend
npm ci
Copy-Item .env.example .env
npm run check:ollama
npm run dev
```

In another terminal from the project root:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Open http://localhost:5173. Root .env uses VITE_API_BASE_URL=/api, forwarded by the Vite proxy to localhost:3001. If your browser has remembered the old demo setting, set the API URL to /api in Settings, save and test the connection.

SQLite is created automatically at backend/data/breaktrail.sqlite. No external database or local API key is required.

## Working flows

- All 24 design screens with responsive desktop/mobile navigation.
- Zod-validated preferences and AI plans; separate labeled demo mode when no API is configured.
- Ollama selects a place only from eligible SQLite catalogue entries and creates a mission/explanation.
- Saved plans, imports, preferences and reflections sync to SQLite through an idempotent offline queue.
- Failed writes remain in browser storage; Settings shows pending sync and Retry.
- Explicit Load from SQLite and Save this device to SQLite operations transfer snapshots.
- JSON plan and backup import/export, PNG outdoor cards, history/mood filtering.
- Timestamp-based outdoor timer, pause/resume, return stage and reflection.
- Optional GPS with manual starting-area fallback.
- Production PWA cache for the interface and bundled images.

SQLite snapshots replace the single-profile database's saved plans/history. The UI asks before replacing browser data. The local timer stays in the browser. Existing browser-local plans are not silently uploaded on first API connection; use Save this device to SQLite if desired.

## 24 screens

Welcome, preferences, offline setup, dashboard, planner, generating, result, place details, saved plans, transfer, history, settings, mobile outdoor card, active timer, paused timer, return reminder, reflection, mobile history, no matches, AI unavailable, location selection, empty history, no saved plan, and delete confirmation.

## Offline use

Initial dependency/model downloads require internet. After setup, run frontend, backend and Ollama on the same laptop to create plans without Wi-Fi. The backend remains a running localhost process.

For a single-server production setup, build the root frontend, set SERVE_FRONTEND=true in backend/.env, restart the backend, and open http://localhost:3001. The frontend build must use VITE_API_BASE_URL=/api. Mobile uses previously imported saved plans and timers; it cannot access the laptop's localhost API outside the laptop. Background alerts are not implemented.

The hosted Site serves only the frontend, not this local Express/SQLite/Ollama service. Local development is the straightforward way to use local inference.

## Commands

```bash
npm run dev
npm run dev:api
npm run typecheck
npm test
npm run test:api
npm run build
npm run preview
```

Install backend dependencies first with npm run setup:api or npm ci inside backend.

## Project structure

```text
src/
  App.tsx                  # 24 screens and integrated user flows
  components/              # Shared React UI and dialogs
  hooks/                   # Routing, local state, SQLite sync queue
  lib/                     # Zod schemas, API, import/export, demo planner
public/assets/             # Local branding and illustrative garden
backend/
  src/app.js               # Express API routes and validation
  src/database.js          # SQLite schema, transactions, persistence
  src/ollama.js            # Structured Qwen requests and readiness checks
  src/planner.js           # Candidate filtering and time budgets
  src/data/places.json      # Editable sample catalogue
  scripts/                 # Seed and Ollama readiness check
  docs/                    # Postman collection
  tests/                   # SQLite/API and mocked Ollama tests
```

## Verification and limits

Tests cover all 24 React screens, migration, plan validation, timestamp timers, backend errors and fallback labels. Backend tests use real SQLite and mocked Ollama outputs. Real model inference and real-browser/device testing must be verified on your machine.

The catalogue is sample data. Fees, opening hours, accessibility and coordinates must be verified before using real destinations. Unknown fees are excluded from a Free budget. The generic neighbourhood option asks you to choose a familiar green space; it does not claim to locate a park. The garden image is illustrative. Walking times are estimates, not live road routing. There is no live weather or crowd integration.

Default AI mode is strict: unavailable/invalid Ollama output returns an error. Explicit ALLOW_RULE_FALLBACK=true returns source: demo and meta.fallback: true, preserving the label in the frontend.

This backend is a single-profile loopback service, not a public multi-user backend. It has no login system. ElevenLabs is not connected; any future narration integration should keep its API key server-side.
