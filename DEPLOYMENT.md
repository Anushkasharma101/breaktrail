# Put BreakTrail online

This package includes the frontend, Express backend, SQLite storage and a private Ollama service. Visitors only need a browser and internet for new AI plans; they do not install Ollama. Cached saved plans and the timer work offline. The catalogue still contains Jaipur sample places, not live maps/weather or verified worldwide coverage.

## 1. Update your GitHub project (Windows)

Extract this ZIP into a NEW folder. Copy its contents into your existing BreakTrail folder, replacing matching source files. Keep your existing .git folder. Never copy node_modules, dist or private .env files into Git.

Open PowerShell in your existing project folder:

```powershell
git add -A
git status
git commit -m "Prepare public deployment and isolate visitor data"
git push origin main
```

Make sure .env and database files are excluded. The ZIP contains examples only; keep your original local .env files private.

## 2. Prepare a Linux server and domain

You need an Ubuntu server running Docker Engine with the Compose plugin, a public IP, and a domain/subdomain you control. This route requires server hosting; it is not a promise of free hosting. A CPU server with roughly 4 GB RAM is a starting point for this small model, not a measured capacity guarantee. Performance depends on the CPU and workload.

If you do not have a server/domain yet, arrange those before proceeding. You do NOT need to deploy separately to Vercel or Render for this route.

Install Docker Engine using https://docs.docker.com/engine/install/ubuntu/ and Compose using https://docs.docker.com/compose/install/linux/. Verify:

```bash
docker --version
docker compose version
```

Commands below run on the SERVER over SSH, not Windows PowerShell. Prefix Docker commands with sudo if your server account requires it.

Create a DNS A record for your chosen hostname pointing to the server's public IP. Only keep an AAAA record if it points to this server's working IPv6 address. Allow inbound TCP 80 and 443 and your SSH port in your server/provider firewall. Keep ports 3001 and 11434 private.

## 3. Download the project on the server

```bash
git clone https://github.com/Anushkasharma101/breaktrail.git
cd breaktrail
```

Create the server's root .env with your actual hostname (no https://, no slash):

```bash
nano .env
```

Enter:

```dotenv
DOMAIN=breaktrail.yourdomain.com
```

Save and exit. Do not commit this file. The Docker image excludes it; Compose uses it to configure the domain. The browser uses /api automatically.

## 4. Start Ollama and download Qwen

```bash
docker compose up -d ollama
docker compose exec ollama ollama pull qwen3:0.6b
docker compose exec ollama ollama list
```

The first download needs internet and can take several minutes. If Ollama is still starting, retry the pull command. Ollama is available to the backend at http://ollama:11434 on Docker's private network. Do not publish Ollama's port publicly.

## 5. Build and start the website

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 app caddy
```

Open https://YOUR_ACTUAL_HOSTNAME in your browser. Caddy obtains and renews HTTPS certificates when DNS points to the server and ports 80/443 are accessible. SQLite, model files and certificates are stored in named persistent volumes.

## 6. Verify before sharing

```bash
curl https://YOUR_ACTUAL_HOSTNAME/api/health
curl https://YOUR_ACTUAL_HOSTNAME/api/ollama/status
```

Health should show status ok and localOnly false. Ollama status should show ready true. In app Settings, use /api, save, and test the connection if your browser remembered an older API setting.

Generate a plan, save it, and reload. Open the website in another browser/incognito window: its saved plans and preferences should be separate. After opening and caching the production app, test saved plans and the timer offline. Creating a new AI plan on the hosted version requires internet.

## Data and limits

There are no email/password accounts. The frontend creates a random 256-bit device bearer token and stores it in browser localStorage; only its hash identifies records in SQLite. Do not share this token. Clearing browser storage loses access to that server profile; export your data first. Separate browsers/devices have separate profiles. Use export/import to transfer data. Incognito storage disappears when closed. A token provides device-profile isolation, not cross-device login or account recovery.

Preferences, plans, history, snapshots and deletion are scoped to that profile. Public catalogue/health/model status are readable without a token. CORS allows the configured website, but the bearer token protects private API endpoints. Local mode still supports the original single-profile workflow. Legacy local SQLite data is migrated into the local profile once and never assigned to public visitors.

The public service allows up to 600 API requests and 10 generation requests per minute globally per process. Ollama generates one plan at a time; busy requests ask visitors to retry. These are small-demo limits, not a guarantee against abusive traffic or production-scale capacity. Run one backend instance with this SQLite deployment. Back up the app_data volume regularly. Never run docker compose down -v unless you deliberately intend to delete stored data/model/certificates.

Strict AI remains enabled: if Ollama is unavailable, the app reports failure rather than claiming a rules-based result is AI. ALLOW_RULE_FALLBACK=true is optional and explicitly labels fallback plans as demo.

## Update later

```bash
git pull origin main
docker compose up -d --build
```

## Local development (Windows)

Install Node 22.13+ and Ollama. In the project folder:

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
npm ci
npm --prefix backend ci
ollama pull qwen3:0.6b
npm run dev:api
```

Open a second terminal in the same folder and run npm run dev. Visit http://localhost:5173. PUBLIC_MODE=false keeps localhost restrictions for local development.

## Optional separate hosts

You can host the backend on Render and frontend on Vercel instead, but you still need a separate private Ollama host. On Render use root directory backend, npm ci, npm start, Node 22.13+, PUBLIC_MODE=true, HOST=0.0.0.0, SERVE_FRONTEND=false and CLIENT_ORIGINS set to the exact frontend HTTPS origin. Attach a paid persistent disk at /data and set DATABASE_PATH=/data/breaktrail.sqlite. Let Render supply PORT. Set OLLAMA_BASE_URL to a secured endpoint reachable from the backend, not your laptop's localhost. The current Ollama adapter does not support an upstream auth header; do not expose an unauthenticated Ollama endpoint to the internet. Use a private network/tunnel or add authenticated upstream support first.

On Vercel use the repository root, npm run build, output dist and VITE_API_BASE_URL=https://YOUR_BACKEND_HOST/api; rebuild after changing this variable. This alternative is not fully configured by the supplied Compose files.

## Validation and references

Automated API and frontend tests use mocked Ollama outputs; they do not prove real model inference or server performance. Docker/server deployment and real browser/device checks must be completed on your machine. Docker was unavailable in the editing environment.

- Ollama Docker: https://docs.ollama.com/docker
- Caddy HTTPS: https://caddyserver.com/docs/automatic-https
- Caddy reverse proxy: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Render persistent disks: https://render.com/docs/disks
