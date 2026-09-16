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
