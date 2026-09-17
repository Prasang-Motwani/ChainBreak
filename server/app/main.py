import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app.api import analyze, packages, simulation  # noqa: E402 (must load .env before importing services that read it)

app = FastAPI(title="ChainBreak API", version="0.1.0")

# Deployed frontend origin(s), e.g. https://chainbreak.vercel.app -- comma
# separated if there's more than one (prod + a preview URL). Set via the
# ALLOWED_ORIGINS env var on the host (Render/Railway/etc); local dev needs
# nothing since the regex below already covers any localhost port.
_extra_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_extra_origins,
    # Vite falls back to 5174/5175/... whenever 5173 is already taken (e.g.
    # another instance left running), so match any localhost port in dev
    # rather than hardcoding one.
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1):\d+$",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router)
app.include_router(packages.router)
app.include_router(simulation.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
