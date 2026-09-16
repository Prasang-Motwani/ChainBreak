"""OpenSSF Scorecard lookups (best-effort).

Scorecard only has data for repositories it has scanned, which excludes
most small/unpopular packages -- a miss is normal and returns None rather
than an error, so callers should treat it as "unknown", not "zero".
"""

import httpx

SCORECARD_API = "https://api.scorecard.dev/projects"
_TIMEOUT = 6.0


async def get_scorecard(owner: str, repo: str) -> float | None:
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(f"{SCORECARD_API}/github.com/{owner}/{repo}")
    except httpx.RequestError:
        return None

    if resp.status_code != 200:
        return None

    return resp.json().get("score")
