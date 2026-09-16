# ChainBreak API

FastAPI backend, built in layers on top of:

```
React → FastAPI → GitHub / deps.dev / OSV / OpenSSF → NetworkX → XGBoost → SHAP → JSON → React
```

## Current milestone

`POST /api/analyze` does real work end-to-end for npm repositories:

1. Validates and parses the GitHub URL.
2. Fetches repository metadata from the GitHub API (404 if missing/private).
3. Fetches `package.json` (422 if absent -- only npm is supported so far).
4. Extracts direct dependencies; resolves exact versions from
   `package-lock.json` when present, otherwise best-effort cleans the
   semver range (`Dependency.resolved` tells you which happened).
5. Builds a version-aware dependency graph with NetworkX
   (`app/graph/builder.py`) and returns it as Cytoscape-ready
   nodes/edges.

Vulnerability counts, scorecard, and risk scores are placeholders (`0`/
`null`) until the OSV/Scorecard/XGBoost/SHAP layers are added -- the graph
itself is real, not mocked.

Reusable NetworkX analysis functions (direct/transitive deps and
dependents, dependency depth, downstream reach, propagation depth/paths,
betweenness centrality, PageRank) live in `app/graph/analysis.py`, ready for
the compromise/mitigation simulators in later milestones.

## Setup

```bash
python -m venv .venv          # use Python 3.11-3.13; pydantic's wheels don't yet support 3.14
.venv/Scripts/activate         # .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env           # optional: add GITHUB_TOKEN to raise the GitHub API rate limit
uvicorn app.main:app --reload --port 8000
```

## Structure

```
app/
  main.py                       FastAPI app, CORS (localhost:5173), .env loading
  api/analyze.py                POST /api/analyze
  services/
    repository.py               GitHub URL -> (owner, name)
    github_service.py           GitHub REST calls (repo metadata, file contents)
    npm_service.py               package.json / package-lock.json parsing
  graph/
    builder.py                  NetworkX graph construction + Cytoscape-shaped serialization
    analysis.py                 Reusable graph metrics (deps, dependents, centrality, propagation)
  models/schemas.py             Pydantic request/response contracts
```

## Edge direction

`{source, target, relationship: "depends_on"}` means **source depends on
target** (e.g. application → package). A node's *dependents* are therefore
its predecessors/ancestors in the graph, and its *dependencies* are its
successors/descendants -- this matters once compromise propagation
(later milestone) needs to walk the graph in reverse, toward dependents.
