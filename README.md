# BreakTrail backend — Express, SQLite and local Ollama

Single-profile backend for your laptop. It generates outdoor break plans through Qwen3 in Ollama, stores preferences/plans/reflections in SQLite, and integrates with the included React frontend.

## Requirements

- Node.js **22.13+** (Node 24 also works) and npm. `node:sqlite` is bundled with Node, so no MySQL/MongoDB or native SQLite package compilation is needed. Node 22 may display an experimental SQLite warning.
- Ollama installed from https://ollama.com/download/windows on Windows, or https://ollama.com/download for other platforms.
- An initial internet connection to install dependencies and download the model. Once installed, laptop frontend + backend + model can run locally without Wi-Fi.

## 1. Install Ollama and download Qwen

Open PowerShell after installing Ollama:

```powershell
ollama --version
ollama pull qwen3:0.6b
ollama list
```

The Ollama application normally starts the API. If it is not running, open the Ollama application or run this in a separate terminal:

```powershell
ollama serve
```

If it says port 11434 is already in use, another Ollama instance may already be running. Check the status rather than starting a second instance.

Optional: warm/test the model before starting the app:

```powershell
ollama run qwen3:0.6b
```

Ask it a short question, then enter `/bye` to exit chat. The backend communicates with the Ollama API; you do not need to leave this interactive chat open.

## 2. Start the backend

From the downloaded project root:

```powershell
cd backend
npm ci
Copy-Item .env.example .env
npm run seed
npm run check:ollama
npm run dev
```

`npm run seed` is optional for first startup: empty databases seed automatically. Explicit seeding updates the bundled catalogue without deleting plans/history.

Keep this terminal open. Backend URL: http://localhost:3001/api. SQLite file: `backend/data/breaktrail.sqlite`. Do not upload that file to Git.

Check in another terminal:

```powershell
Invoke-RestMethod http://localhost:3001/api/health
Invoke-RestMethod http://localhost:3001/api/ollama/status
```

The second endpoint should show `ready: true` and model `qwen3:0.6b`. The health endpoint reports that the backend/database are alive; it does not imply the model is ready.

## 3. Start the integrated React frontend

Open a new terminal at the project root (outside backend):

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

The root `.env` should contain:

```dotenv
VITE_API_BASE_URL=/api
```

Visit http://localhost:5173. The Vite proxy forwards `/api` to the Express server on port 3001.

If you have previously used the demo, the browser may have remembered an empty/old API URL. Open **Settings**, set API base URL to **`/api`**, save, then **Test saved connection**. Alternatively set `http://localhost:3001/api` for direct local access. The base URL includes `/api`, not `/api/plans`.

Use Planner → Find my break. A successful Ollama plan shows `source: ai`; generation failures show the recovery screen. Saving a plan, removing it, saving a reflection, importing a plan, and saving Settings enqueue database updates automatically. In Settings, SQLite sync displays pending actions and allows Retry, Load from SQLite, or Save this device to SQLite.

Existing browser-local plans are not silently uploaded on first connection. Use **Save this device to SQLite** if you want to transfer the existing local snapshot. This replaces saved plans/history in this single-profile database. **Load from SQLite** asks before replacing browser data. Active timers remain local.

## 4. Run the production app without Wi-Fi

At the project root, with `.env` containing `VITE_API_BASE_URL=/api`:

```powershell
npm run build
```

Set `SERVE_FRONTEND=true` in `backend/.env`, then restart the backend with `npm start` inside backend. Open **http://localhost:3001**. Frontend, API and Ollama all run on the same laptop. No Wi-Fi is needed after downloads; the services must still be running.

Use Offline setup to check the PWA cache. Your phone can use imported cards and timers after loading/caching the frontend, but cannot reach your laptop's localhost API while away. Generate plans on the laptop before going outside. The public/private hosted frontend URL does not host this local Express/SQLite/Ollama service.

## How Ollama is used

1. Express validates the planning input using Zod.
2. SQLite supplies candidate places.
3. Rules filter candidates by mood, starting area, known fee, and available time.
4. With verified coordinates and optional GPS, walking time is estimated from straight-line distance at 80 m/min. This is not road routing. Without coordinates the catalogue's explicit sample walk time is used.
5. Express sends the shortlist and request to `POST http://127.0.0.1:11434/api/chat` with `model: qwen3:0.6b`, `stream: false`, `think: false` and a JSON output schema.
6. Qwen selects a permitted place ID and writes the activity and explanation.
7. Express rejects invented IDs or malformed output, calculates the final travel/activity budget, and saves the generated plan in SQLite.
8. React validates the response again with Zod and displays it.

Generated plans start **unsaved** in SQLite. The Save for outside action marks them saved. AI model output does not determine addresses, fees, travel times, or operating hours.

No API key is required for this local Ollama endpoint. No OpenRouter dependency is included.

## Environment variables

| Variable | Default / purpose |
|---|---|
| HOST | 127.0.0.1; loopback only |
| PORT | 3001 |
| DATABASE_PATH | ./data/breaktrail.sqlite, relative to backend |
| CLIENT_ORIGINS | Comma-separated permitted local frontend origins |
| OLLAMA_BASE_URL | http://127.0.0.1:11434 |
| OLLAMA_MODEL | qwen3:0.6b |
| OLLAMA_TIMEOUT_MS | 90000 |
| ALLOW_RULE_FALLBACK | false |
| SERVE_FRONTEND | false; true to serve the root production dist folder |

If small-model quality is weak, download `qwen3:1.7b` and change OLLAMA_MODEL, then restart. This requires more resources; benchmark on your laptop. The model is never downloaded automatically by the backend.

Fallback is off by default. If you explicitly set `ALLOW_RULE_FALLBACK=true`, failed model generation can return a rule-based plan with `source: demo`, `meta.fallback: true`, and a visible explanation. The frontend preserves that label. It is not presented as a successful open-AI result.

## API reference

Base URL: http://localhost:3001/api. All JSON inputs are validated. Error shape: `{ "error": { "code": "...", "message": "..." } }`.

| Method | Path | Purpose |
|---|---|---|
| GET | /health | Backend/SQLite liveness |
| GET | /ollama/status | Ollama availability and installed model |
| GET | /places | Catalogue; optional area/mood/minutes/budget filters |
| GET | /places/:id | Place details |
| GET | /preferences | Stored preferences |
| PUT | /preferences | Save name, area, minutes, mood, budget, request |
| POST | /plans | Generate and store an Ollama plan |
| GET | /plans/:id | Read a generated plan |
| GET | /saved-plans | Saved plans |
| POST | /saved-plans | Upsert a full plan as saved (also supports imports) |
| DELETE | /saved-plans/:id | Unsave a plan |
| GET | /history | Completed breaks/reflections |
| POST | /history | Upsert `{ plan, completedAt, feeling, observation }` |
| DELETE | /history/:id | Remove a reflection by returned history ID |
| GET | /state | Export preferences, saved plans and history |
| PUT | /state | Atomically replace preferences/saved plans/history |
| DELETE | /data | Clear plans/history and reset preferences; keep catalogue |

### Generate a plan from PowerShell

```powershell
$body = @{
  area = 'Central Jaipur'
  minutes = 20
  mood = 'Quiet'
  budget = 'Free'
  request = 'A calm break before my next meeting'
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri http://localhost:3001/api/plans -Method Post -ContentType 'application/json' -Body $body
$result.plan

Invoke-RestMethod -Uri http://localhost:3001/api/saved-plans -Method Post -ContentType 'application/json' -Body ($result.plan | ConvertTo-Json -Depth 10)
```

Import `docs/BreakTrail.postman_collection.json` into Postman for the same endpoints.

## Catalogue and local data

Edit `src/data/places.json`, then run `npm run seed`. Default catalogue entries are illustrative and explicitly unverified. Unknown fees are excluded for a Free budget. The generic neighbourhood option asks you to choose a familiar space rather than pretending to locate one. Verify fees, hours, walk times and coordinates before replacing it with real destinations.

SQLite tables: places, preferences, plans (saved flag), history. Upserts make offline replay idempotent. A snapshot replacement uses a database transaction. Schema version is 1; later schema changes should add explicit migrations.

The sync queue is stored in the browser and bound to the configured API URL. Failed writes remain pending until Retry or a browser online event. Operations for an old API URL only run when that URL is selected again. Queue capacity is 200; the UI reports overflow and can push a full snapshot after the backlog clears. Loading SQLite is blocked while the current API has pending writes to avoid overwriting unsynced browser changes. Deleting local data clears the pending local queue and queues deletion for the currently configured API.

This is a single-profile local service. It binds to loopback and rejects non-local hostnames/unapproved origins. It has no public multi-user accounts or authorization model. Do not expose this service publicly without adding authentication and deployment protections.

## Troubleshooting

| Issue | Fix |
|---|---|
| ollama not recognized | Restart PowerShell after installing; check Ollama installation |
| model not installed | ollama pull qwen3:0.6b, then npm run check:ollama |
| model times out | Warm it using ollama run; close memory-heavy apps; adjust timeout if needed |
| invalid AI response | Try again; improve prompt or use qwen3:1.7b |
| Backend returned 404 from frontend | Use /api only during Vite proxy / single-server production; otherwise use http://localhost:3001/api |
| CORS / ORIGIN_DENIED | Add the exact frontend origin to CLIENT_ORIGINS and restart backend |
| sqlite module not found | Upgrade Node to at least 22.13 |
| EADDRINUSE on 3001 | Stop the older backend or change PORT and the Vite proxy target |
| SQLite sync pending | Start backend, confirm API URL, then Retry pending sync |
| Hosted app cannot reach localhost | Run the included frontend locally alongside the backend |

## Tests and verification

```powershell
npm test
```

Tests use real temporary SQLite databases and mocked Ollama responses, covering persistence, idempotent replay, validation, shortlist constraints, strict/fallback handling, CORS, and the Ollama request format. Real Qwen inference must be verified on your machine with `npm run check:ollama` and a generated plan. This development environment did not have a running Ollama model.
