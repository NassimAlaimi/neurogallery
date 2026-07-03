"""Pure decode logic: per-category linear decoders (reproduction of Horikawa 2013).

No bdpy, no I/O. Trains on awake perception patterns, predicts on sleep patterns.
"""
from __future__ import annotations

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline


def fit_category_decoders(X_perc: np.ndarray, Y_perc: np.ndarray) -> list:
    """One standardized L2 logistic decoder per category column of Y_perc."""
    decoders = []
    for k in range(Y_perc.shape[1]):
        y = Y_perc[:, k]
        clf = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000, C=1.0))
        if len(np.unique(y)) < 2:
            clf = None  # degenerate column (all present or all absent)
        else:
            clf.fit(X_perc, y)
        decoders.append(clf)
    return decoders


def predict_scores(decoders: list, X_sleep: np.ndarray) -> np.ndarray:
    """Per-category decision scores for each sleep sample. Degenerate cols -> 0."""
    cols = []
    for clf in decoders:
        if clf is None:
            cols.append(np.zeros(X_sleep.shape[0]))
        else:
            cols.append(clf.decision_function(X_sleep))
    return np.column_stack(cols)


def top_k(scores_row: np.ndarray, category_names: list[str], k: int = 3) -> list[str]:
    """The k highest-scoring category names for one sample (descending)."""
    order = np.argsort(np.asarray(scores_row))[::-1][:k]
    return [category_names[i] for i in order]


def pairwise_identification_accuracy(
    scores: np.ndarray, Y_true: np.ndarray, rng_seed: int = 0
) -> float:
    """Horikawa's metric: for each sample, is its score vector more correlated
    with its own label vector than with a randomly paired other sample's labels?
    Chance = 0.5. Deterministic given rng_seed.
    """
    scores = np.asarray(scores, dtype=float)
    Y = np.asarray(Y_true, dtype=float)
    n = scores.shape[0]
    if n < 2:
        return 0.0
    rng = np.random.default_rng(rng_seed)
    perm = rng.permutation(n)

    def corr(a, b):
        a = a - a.mean(); b = b - b.mean()
        denom = np.linalg.norm(a) * np.linalg.norm(b)
        return float(a @ b / denom) if denom > 0 else 0.0

    total = 0.0
    for i in range(n):
        j = perm[i]
        if j == i:
            j = (i + 1) % n
        self_corr = corr(scores[i], Y[i])
        other_corr = corr(scores[i], Y[j])
        if self_corr > other_corr:
            total += 1.0
        elif self_corr == other_corr:
            total += 0.5
    return total / n


def _reported_from_row(y_row, category_names):
    return [category_names[i] for i in range(len(category_names)) if y_row[i] == 1]


def to_dream_examples(selected, category_names, scores, Y_true, reports, subject, k=3):
    """Build real dream example dicts for the given sleep-sample indices.

    First selected index is `featured`. `reported` = that sample's true categories;
    `decoded` = top-k of its score row. `reports[idx]` -> report_reconstructed.
    """
    from neurogallery.dreams.build import example_from_decode

    out = []
    for rank, idx in enumerate(selected):
        reported = _reported_from_row(Y_true[idx], category_names)
        if not reported:
            raise ValueError(
                f"sleep sample {idx} has no reported categories; "
                "select only awakenings that carry a visual report"
            )
        out.append(example_from_decode(
            id=f"dream-{rank + 1:02d}",
            featured=(rank == 0),
            subject=subject,
            reported=reported,
            decoded=top_k(scores[idx], category_names, k),
            report_reconstructed=reports[idx],
        ))
    return out


def assemble_decoded_manifest(examples_list: list[dict], accuracy_pct: float) -> dict:
    """Full dreams.json dict from real decoded examples + measured accuracy."""
    from neurogallery.dreams import examples as ex_mod

    study = dict(ex_mod.STUDY)
    study["decoder"] = "our reproduction of Horikawa 2013 (per-category logistic regression)"
    return {
        "study": study,
        "examples": examples_list,
        "study_metrics": {
            "pairwise_accuracy_pct": round(float(accuracy_pct), 1),
            "note": (
                "Pairwise identification accuracy of our reproduction on the real "
                "sleep set (chance 50%). Measured, not the paper's figure."
            ),
        },
        "sources": [dict(s) for s in ex_mod.SOURCES],
    }
