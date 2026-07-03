"""bdpy-specific extraction, isolated so the rest of the decode is data-agnostic.

The exact keys (ROI name, label column, perception/sleep split flag) come from
`scripts/acquire_dreams.py`'s inspection output; override DecodeConfig accordingly.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass
class DecodeConfig:
    roi: str = "ROI_VC = 1"          # voxel-selection expression (visual cortex)
    label_key: str = "Label"          # metadata column holding category synset/id
    sleep_flag: str = "Sleep"         # design column: 1 = sleep sample, 0 = perception
    top_k: int = 3


def extract_arrays(bdata, cfg: DecodeConfig):
    """Return (X_perc, Y_perc, X_sleep, Y_sleep, category_names) from a bdpy BData.

    Y_* are multi-hot [n, n_cat] over the sorted unique category labels.
    """
    X = bdata.select(cfg.roi)                       # [n_samples, n_vox]
    labels = bdata.get_label(cfg.label_key)        # length n_samples (category per sample)
    sleep = np.asarray(bdata.select(cfg.sleep_flag)).ravel().astype(int)

    category_names = sorted({str(l) for l in labels})
    index = {name: i for i, name in enumerate(category_names)}
    Y = np.zeros((len(labels), len(category_names)), dtype=int)
    for row, l in enumerate(labels):
        Y[row, index[str(l)]] = 1

    perc = sleep == 0
    slp = sleep == 1
    return X[perc], Y[perc], X[slp], Y[slp], category_names
