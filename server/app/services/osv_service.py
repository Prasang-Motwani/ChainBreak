"""OSV.dev vulnerability lookups.

OSV's querybatch endpoint only returns vulnerability IDs (no severity), so a
second round of requests fetches full records to compute real CVSS scores.
Severity falls back to OSV's own database_specific.severity band only when
no parseable CVSS_V3 vector is present (some advisories only carry that).
"""

import asyncio

import httpx

from app.services.cvss import cvss_v3_base_score

OSV_API = "https://api.osv.dev/v1"
_TIMEOUT = 15.0

_SEVERITY_FALLBACK = {"LOW": 3.0, "MODERATE": 5.5, "MEDIUM": 5.5, "HIGH": 7.5, "CRITICAL": 9.5}


async def _query_batch(packages: list[tuple[str, str]], ecosystem: str) -> list[list[str]]:
    """Returns, per (name, version) in `packages`, the list of vuln IDs affecting it."""
    queries = [{"package": {"name": name, "ecosystem": ecosystem}, "version": version} for name, version in packages]
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.post(f"{OSV_API}/querybatch", json={"queries": queries})
    if resp.status_code != 200:
        return [[] for _ in packages]

    results = resp.json().get("results", [])
    return [[v["id"] for v in result.get("vulns", [])] for result in results]


async def _fetch_vuln_detail(client: httpx.AsyncClient, vuln_id: str) -> dict | None:
    try:
        resp = await client.get(f"{OSV_API}/vulns/{vuln_id}")
    except httpx.RequestError:
        return None
    return resp.json() if resp.status_code == 200 else None


def _extract_cvss(vuln: dict) -> float | None:
    for severity in vuln.get("severity", []):
        if severity.get("type") in ("CVSS_V3", "CVSS_V4"):
            score = cvss_v3_base_score(severity.get("score", ""))
            if score is not None:
                return score
    band = vuln.get("database_specific", {}).get("severity")
    return _SEVERITY_FALLBACK.get(band)


async def get_package_vulnerabilities(
    packages: list[tuple[str, str]], ecosystem: str = "npm"
) -> dict[str, dict[str, float | int]]:
    """packages: [(name, version), ...] (only entries with a concrete version
    are meaningful -- callers should filter out unresolved ones).

    Returns {"name@version": {"vulnerabilities": int, "max_cvss": float,
    "scores": list[float]}}. `scores` holds every individually-scored
    vuln's CVSS (for mean/high/critical-count feature engineering); it's
    shorter than `vulnerabilities` whenever an advisory has no parseable
    CVSS_V3 vector and no database_specific.severity band either.
    """
    if not packages:
        return {}

    vuln_id_lists = await _query_batch(packages, ecosystem)
    all_ids = {vid for ids in vuln_id_lists for vid in ids}

    details: dict[str, dict] = {}
    if all_ids:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            fetched = await asyncio.gather(*[_fetch_vuln_detail(client, vid) for vid in all_ids])
        details = {vid: data for vid, data in zip(all_ids, fetched) if data is not None}

    out: dict[str, dict] = {}
    for (name, version), vuln_ids in zip(packages, vuln_id_lists):
        scores = [_extract_cvss(details[vid]) for vid in vuln_ids if vid in details]
        scores = [s for s in scores if s is not None]
        out[f"{name}@{version}"] = {
            "vulnerabilities": len(vuln_ids),
            "max_cvss": max(scores) if scores else 0.0,
            "scores": scores,
        }
    return out
