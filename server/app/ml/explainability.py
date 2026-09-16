"""SHAP-based explanation of the XGBoost risk engine's output.

This explains WHY the model produced a given downstream-impact profile
(feature attribution over a real trained model) -- it is not a claim that
the package will actually be compromised (see risk_engine.py's product
rule).
"""

from functools import lru_cache

import numpy as np
import shap

from app.ml.features import FEATURE_ORDER, feature_vector_to_list
from app.ml.risk_engine import LABELS, get_model


@lru_cache(maxsize=1)
def _get_explainer() -> shap.TreeExplainer:
    return shap.TreeExplainer(get_model())


def explain(feature_vector: dict[str, float], predicted_label: str, top_n: int = 7) -> list[dict]:
    explainer = _get_explainer()
    x = np.array([feature_vector_to_list(feature_vector)])
    raw = explainer.shap_values(x)
    label_index = LABELS.index(predicted_label)

    # SHAP's output layout for multi-class trees varies by version:
    # a list of per-class arrays, an (n_samples, n_features, n_classes)
    # array, or an (n_classes, n_samples, n_features) array. Normalize all
    # three to a single (n_features,) row for the predicted class.
    if isinstance(raw, list):
        row = np.asarray(raw[label_index])[0]
    else:
        values = np.asarray(raw)
        if values.ndim == 3 and values.shape[-1] == len(LABELS):
            row = values[0, :, label_index]
        elif values.ndim == 3:
            row = values[label_index, 0, :]
        else:
            row = values[0]

    contributions = [{"feature": name, "contribution": float(value)} for name, value in zip(FEATURE_ORDER, row)]
    contributions.sort(key=lambda c: abs(c["contribution"]), reverse=True)
    return contributions[:top_n]
