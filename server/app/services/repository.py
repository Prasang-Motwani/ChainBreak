"""GitHub URL parsing. Ecosystem detection lives in the analyze flow itself,
since it depends on which manifest files actually exist in the repo.
"""

import re

from fastapi import HTTPException

_GITHUB_URL_RE = re.compile(
    r"^(?:https?://)?(?:www\.)?github\.com/(?P<owner>[\w.-]+)/(?P<name>[\w.-]+?)(?:\.git)?/?$"
)


def parse_github_url(repository_url: str) -> tuple[str, str]:
    """Extract (owner, name) from a GitHub repository URL."""
    match = _GITHUB_URL_RE.match(repository_url.strip())
    if not match:
        raise HTTPException(status_code=422, detail="Not a valid GitHub repository URL.")
    return match.group("owner"), match.group("name")
