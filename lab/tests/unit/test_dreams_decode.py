import numpy as np

from neurogallery.dreams.decode import (
    fit_category_decoders, predict_scores, top_k, pairwise_identification_accuracy,
)


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
    Y = np.array([[1, 0, 0], [0, 1, 0], [0, 0, 1]] * 20)
    # perfect scores == labels -> accuracy 1.0
    assert pairwise_identification_accuracy(Y.astype(float), Y, rng_seed=1) == 1.0
    # random scores -> around chance 0.5
    rng = np.random.default_rng(2)
    acc = pairwise_identification_accuracy(rng.normal(size=Y.shape), Y, rng_seed=3)
    assert 0.3 < acc < 0.7
