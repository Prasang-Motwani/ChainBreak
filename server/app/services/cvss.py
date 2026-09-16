"""CVSS v3.1 base-score calculator.

OSV records a CVSS_V3 "score" as the raw vector string (e.g.
"CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"), not a numeric value, so a
real base-score computation is needed rather than guessing. Implements the
official FIRST.org CVSS v3.1 specification section 7.4 (base score formula).
"""

import math
import re

_AV = {"N": 0.85, "A": 0.62, "L": 0.55, "P": 0.2}
_AC = {"L": 0.77, "H": 0.44}
_PR_UNCHANGED = {"N": 0.85, "L": 0.62, "H": 0.27}
_PR_CHANGED = {"N": 0.85, "L": 0.68, "H": 0.5}
_UI = {"N": 0.85, "R": 0.62}
_CIA = {"N": 0.0, "L": 0.22, "H": 0.56}

_VECTOR_RE = re.compile(r"CVSS:3\.[01]/(.+)")


def _round_up(value: float) -> float:
    """CVSS spec's "Roundup" -- round up to the nearest 0.1, avoiding
    binary floating-point error via the integer trick from the spec.
    """
    int_input = round(value * 100000)
    if int_input % 10000 == 0:
        return int_input / 100000
    return (math.floor(int_input / 10000) + 1) / 10


def cvss_v3_base_score(vector: str) -> float | None:
    """Returns the CVSS v3.x base score for a vector string, or None if the
    vector can't be parsed.
    """
    match = _VECTOR_RE.match(vector.strip())
    if not match:
        return None

    metrics: dict[str, str] = {}
    for part in match.group(1).split("/"):
        if ":" not in part:
            continue
        key, value = part.split(":", 1)
        metrics[key] = value

    try:
        av = _AV[metrics["AV"]]
        ac = _AC[metrics["AC"]]
        ui = _UI[metrics["UI"]]
        scope_changed = metrics["S"] == "C"
        pr = (_PR_CHANGED if scope_changed else _PR_UNCHANGED)[metrics["PR"]]
        c = _CIA[metrics["C"]]
        i = _CIA[metrics["I"]]
        a = _CIA[metrics["A"]]
    except KeyError:
        return None

    iss = 1 - ((1 - c) * (1 - i) * (1 - a))
    if scope_changed:
        impact = 7.52 * (iss - 0.029) - 3.25 * (iss - 0.02) ** 15
    else:
        impact = 6.42 * iss

    if impact <= 0:
        return 0.0

    exploitability = 8.22 * av * ac * pr * ui

    if scope_changed:
        return min(_round_up(1.08 * (impact + exploitability)), 10.0)
    return min(_round_up(impact + exploitability), 10.0)
