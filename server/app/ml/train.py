"""Bootstraps the XGBoost risk-engine model.

IMPORTANT CAVEAT: there is no public dataset of real "a compromise here
caused X downstream impact" incidents to train on. This generates a
synthetic feature distribution and derives training LABELS from a
documented heuristic scoring rule (`_heuristic_risk_score`) -- weak
supervision, a standard bootstrap technique for standing up a model before
real ground truth exists. The MODEL is a real, gradient-boosted XGBoost
classifier making real predictions from real input features (see
features.py); only the training labels are heuristic, not the inference
itself, and this file is the one and only place that heuristic lives.
Swap `_heuristic_risk_score` for real historical labels the moment such a
dataset exists -- risk_engine.py's interface does not need to change.
"""

from pathlib import Path

import numpy as np
import xgboost as xgb

from app.ml.features import FEATURE_ORDER

MODEL_PATH = Path(__file__).parent / "model.json"

_RNG = np.random.default_rng(42)


def _sample_features(n: int) -> np.ndarray:
    vuln_count = _RNG.poisson(0.6, n).astype(float)
    max_cvss = np.clip(_RNG.exponential(2.0, n) * (vuln_count > 0), 0, 10)
    mean_cvss = max_cvss * _RNG.uniform(0.6, 1.0, n)
    high_vuln = np.minimum(vuln_count, (max_cvss >= 7).astype(float) * _RNG.integers(0, 2, n))
    critical_vuln = np.minimum(vuln_count, (max_cvss >= 9).astype(float) * _RNG.integers(0, 2, n))

    direct_deps = _RNG.poisson(3, n).astype(float)
    transitive_deps = direct_deps * _RNG.integers(1, 5, n)
    direct_dependents = np.maximum(_RNG.zipf(2.5, n) - 1, 0).astype(float)
    transitive_dependents = direct_dependents * _RNG.integers(1, 50, n)
    depth = _RNG.integers(0, 6, n).astype(float)
    betweenness = _RNG.beta(1.5, 20, n)
    pagerank = _RNG.beta(1.5, 30, n)
    is_direct = _RNG.integers(0, 2, n).astype(float)

    downstream_packages = transitive_dependents * _RNG.uniform(0.3, 0.8, n)
    downstream_apps = transitive_dependents * _RNG.uniform(0.0, 0.3, n)
    critical_downstream = downstream_packages * _RNG.uniform(0, 0.2, n)
    propagation_paths = transitive_dependents * _RNG.uniform(0.5, 3, n)
    max_propagation_depth = depth + _RNG.integers(0, 4, n)

    scorecard = np.clip(_RNG.normal(6, 2, n), 0, 10)
    project_age = np.clip(_RNG.exponential(4, n), 0, 20)
    releases_per_year = np.clip(_RNG.exponential(4, n), 0, 50)
    maintainer_count = (_RNG.poisson(2, n) + 1).astype(float)

    columns = [
        vuln_count, max_cvss, mean_cvss, high_vuln, critical_vuln,
        direct_deps, transitive_deps, direct_dependents, transitive_dependents,
        depth, betweenness, pagerank, is_direct,
        downstream_packages, downstream_apps, critical_downstream,
        propagation_paths, max_propagation_depth,
        scorecard, project_age, releases_per_year, maintainer_count,
    ]
    assert len(columns) == len(FEATURE_ORDER)
    return np.column_stack(columns)


def _heuristic_risk_score(x: np.ndarray) -> np.ndarray:
    idx = {name: i for i, name in enumerate(FEATURE_ORDER)}
    return (
        x[:, idx["critical_vuln_count"]] * 3.0
        + x[:, idx["high_vuln_count"]] * 1.5
        + (x[:, idx["max_cvss"]] / 10) * 2.0
        + np.log1p(x[:, idx["transitive_dependents"]]) * 1.2
        + x[:, idx["betweenness_centrality"]] * 8.0
        + x[:, idx["pagerank"]] * 15.0
        + np.log1p(x[:, idx["downstream_application_count"]]) * 1.0
        + np.log1p(x[:, idx["critical_downstream_count"]]) * 1.5
        + np.log1p(x[:, idx["propagation_path_count"]]) * 0.8
        + x[:, idx["max_propagation_depth"]] * 0.2
        + ((10 - x[:, idx["scorecard_score"]]) / 10) * 1.5
        + (x[:, idx["maintainer_count"]] <= 1).astype(float) * 1.0
        + (x[:, idx["releases_per_year"]] < 1).astype(float) * 0.5
    )


def _labels_from_scores(score: np.ndarray) -> np.ndarray:
    low_cut, high_cut = np.quantile(score, [0.5, 0.85])
    labels = np.zeros_like(score, dtype=int)
    labels[score > low_cut] = 1
    labels[score > high_cut] = 2
    return labels


def train_and_save(n_samples: int = 6000) -> None:
    x = _sample_features(n_samples)
    score = _heuristic_risk_score(x)
    y = _labels_from_scores(score)

    model = xgb.XGBClassifier(
        objective="multi:softprob",
        num_class=3,
        max_depth=4,
        n_estimators=150,
        learning_rate=0.1,
        subsample=0.9,
        colsample_bytree=0.9,
        random_state=42,
    )
    model.fit(x, y)
    model.save_model(str(MODEL_PATH))


if __name__ == "__main__":
    train_and_save()
    print(f"Saved model to {MODEL_PATH}")
