"""npm manifest/lockfile parsing for the ecosystem's first milestone.

Version resolution priority: package-lock.json (exact, installed version) >
best-effort semver-range cleanup (approximate; documented on the Dependency
via `resolved=False`). Real resolution against the npm registry/deps.dev
lands in a later milestone.
"""

import json
import re

from fastapi import HTTPException


def parse_package_json(content: str) -> dict:
    try:
        data = json.loads(content)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail="package.json is not valid JSON.") from exc
    if not isinstance(data, dict):
        raise HTTPException(status_code=422, detail="package.json is not a valid JSON object.")
    return data


def extract_direct_dependencies(package_json: dict) -> dict[str, str]:
    """Returns {name: version_range} from the "dependencies" field."""
    deps = package_json.get("dependencies", {})
    if not isinstance(deps, dict):
        return {}
    return {name: str(version_range) for name, version_range in deps.items()}


_RANGE_PREFIX_RE = re.compile(r"^[\^~>=<\s]*")


def clean_version_range(version_range: str) -> str:
    """Strips semver range operators (^, ~, >=, ...) to approximate an
    installable version when no lockfile entry is available. Compound
    ranges ("1.x || 2.x", ">=2.0.0 <3.0.0") take the first bound.
    """
    first_clause = re.split(r"\s*(?:\|\|| )\s*", version_range.strip())[0]
    cleaned = _RANGE_PREFIX_RE.sub("", first_clause).strip()
    return cleaned or version_range


def parse_lockfile_versions(content: str) -> dict[str, str]:
    """Returns {name: resolved_version}, supporting both the npm v1
    ("dependencies" map) and v2/v3 ("packages" map) lockfile formats.
    Malformed lockfiles degrade to "no exact versions available" rather
    than failing the whole analysis.
    """
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        return {}

    versions: dict[str, str] = {}

    packages = data.get("packages")
    if isinstance(packages, dict):
        for pkg_path, meta in packages.items():
            if not pkg_path.startswith("node_modules/") or not isinstance(meta, dict):
                continue
            name = pkg_path.rsplit("node_modules/", 1)[-1]
            version = meta.get("version")
            if name and version and name not in versions:
                versions[name] = version

    legacy = data.get("dependencies")
    if isinstance(legacy, dict):
        for name, meta in legacy.items():
            if isinstance(meta, dict) and meta.get("version") and name not in versions:
                versions[name] = meta["version"]

    return versions
