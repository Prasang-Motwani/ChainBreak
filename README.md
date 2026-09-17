# ChainBreak

Open-Source Supply Chain Risk Intelligence.

```
React + Tailwind + Cytoscape (client/)
        ↓ HTTP / JSON
FastAPI (server/)
        ↓
GitHub / deps.dev / OSV → NetworkX → XGBoost → SHAP
        ↓
Unified analysis JSON
        ↓
React UI
```

## Layout

- [`client/`](client/) — React + Vite + Tailwind + Cytoscape.js frontend.
- [`server/`](server/) — FastAPI backend, built in layers (see [server/README.md](server/README.md)).

## Running locally

```bash
# backend
cd server
python -m venv .venv && .venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# frontend (separate terminal)
cd client
npm install
npm run dev
```

The client talks to the backend at `http://localhost:8000` by default
(override with `VITE_API_BASE_URL`). If the backend isn't running, the
client falls back to local mock data so the UI still works standalone.

## Deploying

Frontend and backend deploy to separate hosts. Vercel's serverless
functions aren't a fit for the backend here: real `/api/analyze` calls take
several seconds to tens of seconds (chained GitHub/OSV/npm/Scorecard
lookups), which exceeds Vercel's function timeout on the free tier, and the
in-memory analysis cache (`server/app/cache.py`) that the package/simulate
endpoints depend on needs a long-lived process, not a stateless invocation
per request.

**Backend (Render)** — `render.yaml` at the repo root is a ready-to-use
[Render Blueprint](https://render.com/docs/blueprint-spec):
1. render.com → New → Blueprint → connect this GitHub repo → Apply.
2. Once deployed, open the service's Environment tab and set `GITHUB_TOKEN`
   (recommended, raises the GitHub API rate limit) and `ALLOWED_ORIGINS`
   (the frontend URL from the Vercel step below, once you have it).
3. Note the service URL, e.g. `https://chainbreak-api.onrender.com`.

**Frontend (Vercel)**:
1. vercel.com → Add New → Project → import this GitHub repo.
2. Set **Root Directory** to `client` (framework/build settings are picked
   up from `client/vercel.json`).
3. Add an environment variable `VITE_API_BASE_URL` = the Render URL from
   above, then deploy.
4. Go back to the Render service's `ALLOWED_ORIGINS` env var and set it to
   the Vercel URL, so the backend's CORS allows it.

Free tiers on both: Render's free web service spins down after 15 minutes
idle, so the first request after a lull can take ~30-50s to cold-start --
expected, not a bug.
