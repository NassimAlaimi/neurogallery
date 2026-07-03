import json
from pathlib import Path

import numpy as np
import jsonschema
import pytest

from neurogallery.dreams.decode import (
    fit_category_decoders, predict_scores, top_k, pairwise_identification_accuracy,
    to_dream_examples, assemble_decoded_manifest,
)

SCHEMA = json.loads((Path(__file__).resolve().parents[3] / "dreams.schema.json").read_text())


def _synthetic(n=200, n_vox=40, n_cat=3, seed=0):
    """Each category k is driven by voxel block k -> linearly separable."""
    rng = np.random.default_rng(seed)
    Y = (rng.random((n, n_cat)) > 0.5).astype(int)
    X = rng.normal(0, 0.3, (n, n_vox))
    block = n_vox // n_cat
    for k in range(n_cat):
        X[:, k * block:(k + 1) * block] += Y[:, [k]] * 2.0  # signal for category k
    return X, Y


def test_decoders_recover_planted_category():
    X, Y = _synthetic()
    decoders = fit_category_decoders(X, Y)
    scores = predict_scores(decoders, X)
    assert scores.shape == Y.shape
    # AUC-ish: mean score for positives > negatives, per category
    for k in range(Y.shape[1]):
        pos = scores[Y[:, k] == 1, k].mean()
        neg = scores[Y[:, k] == 0, k].mean()
        assert pos > neg


def test_top_k_returns_highest_categories():
    names = ["person", "street", "car"]
    row = np.array([2.0, -1.0, 0.5])
    assert top_k(row, names, k=2) == ["person", "car"]


def test_pairwise_accuracy_perfect_and_chance():
    Y = np.array([[int(b) for b in format(i + 1, "06b")] for i in range(40)])  # 40 unique 6-bit rows
    # perfect scores == labels, unique rows -> no ties -> exact accuracy 1.0
    assert pairwise_identification_accuracy(Y.astype(float), Y, rng_seed=1) == 1.0
    # random scores -> around chance 0.5 (tie-fair scoring keeps a null decoder honest)
    rng = np.random.default_rng(2)
    acc = pairwise_identification_accuracy(rng.normal(size=Y.shape), Y, rng_seed=3)
    assert 0.35 < acc < 0.65


def test_degenerate_category_column_is_safe():
    X = np.random.default_rng(0).normal(size=(30, 8))
    Y = np.zeros((30, 2), dtype=int)
    Y[:, 0] = (X[:, 0] > 0).astype(int)  # col 1 constant 0
    decoders = fit_category_decoders(X, Y)
    assert decoders[1] is None
    scores = predict_scores(decoders, X)
    assert np.allclose(scores[:, 1], 0.0)


def test_to_dream_examples_builds_reported_and_decoded():
    names = ["person", "street", "car"]
    scores = np.array([[2.0, 1.0, -1.0], [0.0, 0.0, 3.0]])
    Y = np.array([[1, 1, 0], [0, 0, 1]])
    reports = {0: "A street.", 1: "A car."}
    exs = to_dream_examples([0, 1], names, scores, Y, reports, subject="Subject3", k=2)
    assert len(exs) == 2
    assert exs[0]["featured"] is True and exs[1]["featured"] is False
    assert exs[0]["reported"] == ["person", "street"]   # from Y row 0
    assert exs[0]["decoded"] == ["person", "street"]     # top-2 of scores row 0
    assert exs[0]["subject"] == "Subject3"
    assert all("seed" not in e for e in exs)


def test_to_dream_examples_raises_on_empty_reported():
    names = ["person", "street", "car"]
    scores = np.array([[0.0, 0.0, 0.0]])
    Y = np.array([[0, 0, 0]])  # no reported category
    with pytest.raises(ValueError):
        to_dream_examples([0], names, scores, Y, {0: "x"}, subject="S1", k=2)


def test_assemble_decoded_manifest_validates():
    names = ["person", "street", "car"]
    scores = np.array([[2.0, 1.0, -1.0]])
    Y = np.array([[1, 0, 0]])
    exs = to_dream_examples([0], names, scores, Y, {0: "A person."}, subject="S1", k=2)
    manifest = assemble_decoded_manifest(exs, accuracy_pct=57.5)
    jsonschema.validate(manifest, SCHEMA)
    assert manifest["study_metrics"]["pairwise_accuracy_pct"] == 57.5
    assert "decoder" in manifest["study"]
