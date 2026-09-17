"""Thin wrapper around the GitHub REST API.

Set GITHUB_TOKEN in the environment to raise the unauthenticated rate limit
(60 req/hr -> 5000 req/hr). Works without it for light local testing.
"""

import base64
import os
from typing import Optional

import httpx
from fastapi import HTTPException

GITHUB_API = "https://api.github.com"
_TIMEOUT = 10.0


def _headers() -> dict:
    headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


async def _get(url: str, *, params: Optional[dict] = None) -> httpx.Response:
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            return await client.get(url, headers=_headers(), params=params)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"GitHub API request failed: {exc}") from exc


def _raise_for_common_errors(resp: httpx.Response, context: str) -> None:
    if resp.status_code == 403 and resp.headers.get("X-RateLimit-Remaining") == "0":
        raise HTTPException(
            status_code=502,
            detail="GitHub API rate limit exceeded. Set GITHUB_TOKEN to raise the limit.",
        )
    if resp.status_code >= 500:
        raise HTTPException(status_code=502, detail=f"GitHub API error ({resp.status_code}) while {context}.")


async def get_repository(owner: str, name: str) -> dict:
    resp = await _get(f"{GITHUB_API}/repos/{owner}/{name}")
    _raise_for_common_errors(resp, "fetching repository metadata")

    if resp.status_code == 404:
        # GitHub returns 404 (not 403) for private repos when unauthenticated
        # or unauthorized, so the two cases can't be distinguished here.
        raise HTTPException(status_code=404, detail="Repository not found or is private.")
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"GitHub API error ({resp.status_code}).")

    return resp.json()


async def get_file_content(owner: str, name: str, path: str, ref: str) -> Optional[str]:
    """Returns decoded file content, or None if the file doesn't exist."""
    resp = await _get(f"{GITHUB_API}/repos/{owner}/{name}/contents/{path}", params={"ref": ref})
    _raise_for_common_errors(resp, f"fetching {path}")

    if resp.status_code == 404:
        return None
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"GitHub API error ({resp.status_code}) fetching {path}.")

    data = resp.json()
    if isinstance(data, list):
        raise HTTPException(status_code=422, detail=f"{path} is a directory, not a file.")
    if data.get("encoding") != "base64":
        raise HTTPException(status_code=502, detail=f"Unexpected encoding for {path}.")

    return base64.b64decode(data["content"]).decode("utf-8", errors="replace")


async def list_directory(owner: str, name: str, path: str, ref: str) -> Optional[list[dict]]:
    """Returns the Contents API listing for a directory (each item has at
    least "name" and "type"), or None if the path doesn't exist or isn't a
    directory.
    """
    resp = await _get(f"{GITHUB_API}/repos/{owner}/{name}/contents/{path}", params={"ref": ref})
    _raise_for_common_errors(resp, f"listing {path or '/'}")

    if resp.status_code == 404:
        return None
    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"GitHub API error ({resp.status_code}) listing {path or '/'}.")

    data = resp.json()
    return data if isinstance(data, list) else None
