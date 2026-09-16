"""Loads the trained XGBoost model once and exposes prediction.

PRODUCT RULE: this does NOT predict whether a package will actually be
compromised. It predicts a downstream-impact profile -- P(Low)/P(Medium)/
P(High) -- under a modeled/hypothetical compromise scenario, based on the
package's vulnerability, graph-structural, and project signals. Never
describe these probabilities as "chance of being hacked".
"""

from functools import lru_cache
from pathlib import Path

import numpy as np
import xgboost as xgb

from app.ml.features import feature_vector_to_list
from app.ml.train import MODEL_PATH, train_and_save

LABELS = ["LOW", "MEDIUM", "HIGH"]


@lru_cache(maxsize=1)
def get_model() -> xgb.XGBClassifier:
    if not Path(MODEL_PATH).exists():
        train_and_save()
    model = xgb.XGBClassifier()
    model.load_model(str(MODEL_PATH))
    return model


def predict(feature_vector: dict[str, float]) -> dict:
    model = get_model()
    x = np.array([feature_vector_to_list(feature_vector)])
    probs = model.predict_proba(x)[0]
    return {
        "label": LABELS[int(np.argmax(probs))],
        "low": float(probs[0]),
        "medium": float(probs[1]),
        "high": float(probs[2]),
    }
