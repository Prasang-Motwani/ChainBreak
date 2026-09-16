"""npm registry lookups for project-level signals that GitHub's API can't
give us for an arbitrary dependency (maintainer count, package age, release
cadence, and the linked source repository for Scorecard lookups).
"""

import re
from datetime import datetime, timezone

import httpx

REGISTRY_API = "https://registry.npmjs.org"
_TIMEOUT = 8.0

_GITHUB_REPO_RE = re.compile(r"github\.com[:/]([\w.-]+)/([\w.-]+?)(?:\.git)?/?$")


async def get_npm_metadata(name: str) -> dict | None:
    """Returns {maintainer_count, project_age_years, releases_per_year,
    github_repo: (owner, name) | None}, or None if the package isn't found
    on the registry (private/scoped-internal packages, typos, etc).
    """
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(f"{REGISTRY_API}/{name}")
    except httpx.RequestError:
        return None

    if resp.status_code != 200:
        return None

    data = resp.json()
    time_info = data.get("time", {})
    created = time_info.get("created")
    versions = data.get("versions", {})
    latest_tag = data.get("dist-tags", {}).get("latest")
    latest = versions.get(latest_tag, {}) if latest_tag else {}

    project_age_years = 0.0
    if created:
        created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
        project_age_years = (datetime.now(timezone.utc) - created_dt).days / 365.25

    releases_per_year = (len(versions) / project_age_years) if project_age_years > 0 else 0.0

    maintainers = latest.get("maintainers") or data.get("maintainers") or []

    repo_url = (data.get("repository") or {}).get("url", "") if isinstance(data.get("repository"), dict) else ""
    match = _GITHUB_REPO_RE.search(repo_url)
    github_repo = (match.group(1), match.group(2)) if match else None

    return {
        "maintainer_count": len(maintainers),
        "project_age_years": round(project_age_years, 2),
        "releases_per_year": round(releases_per_year, 2),
        "github_repo": github_repo,
    }
