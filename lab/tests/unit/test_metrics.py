import numpy as np
import pytest

from neurogallery.metrics.core import (
    pixcorr,
    ssim_score,
    cosine_similarity,
    two_way_identification,
)


def test_pixcorr_identical_is_one():
    img = np.linspace(0, 1, 64 * 64).reshape(64, 64).astype(np.float32)
    assert pixcorr(img, img) == pytest.approx(1.0, abs=1e-6)


def test_pixcorr_inverted_is_negative():
    img = np.linspace(0, 1, 64 * 64).reshape(64, 64).astype(np.float32)
    assert pixcorr(img, 1.0 - img) < 0


def test_ssim_identical_is_one():
    rng = np.random.default_rng(0)
    img = rng.random((64, 64, 3)).astype(np.float32)
    assert ssim_score(img, img) == pytest.approx(1.0, abs=1e-6)


def test_ssim_grayscale_identical_is_one():
    rng = np.random.default_rng(1)
    img = rng.random((64, 64)).astype(np.float32)
    assert ssim_score(img, img) == pytest.approx(1.0, abs=1e-6)


def test_pixcorr_constant_array_returns_zero_not_nan():
    constant = np.full((64, 64), 0.5, dtype=np.float32)
    other = np.linspace(0, 1, 64 * 64).reshape(64, 64).astype(np.float32)

    result = pixcorr(constant, other)

    assert result == 0.0
    assert not np.isnan(result)


def test_cosine_similarity_zero_vector_returns_zero():
    zero = np.array([0.0, 0.0, 0.0])
    nonzero = np.array([1.0, 2.0, 3.0])

    result = cosine_similarity(zero, nonzero)

    assert result == 0.0
    assert not np.isnan(result)


def test_cosine_similarity_orthogonal_is_zero():
    u = np.array([1.0, 0.0, 0.0])
    v = np.array([0.0, 1.0, 0.0])
    assert cosine_similarity(u, v) == pytest.approx(0.0, abs=1e-6)


def test_two_way_identification_true_when_recon_closer_to_gt():
    gt = np.array([1.0, 0.0, 0.0])
    recon = np.array([0.9, 0.1, 0.0])   # proche de gt
    distractor = np.array([0.0, 1.0, 0.0])
    assert two_way_identification(recon, gt, distractor) is True


def test_two_way_identification_false_when_recon_closer_to_distractor():
    gt = np.array([1.0, 0.0, 0.0])
    recon = np.array([0.0, 0.9, 0.1])   # proche du distracteur
    distractor = np.array([0.0, 1.0, 0.0])
    assert two_way_identification(recon, gt, distractor) is False
