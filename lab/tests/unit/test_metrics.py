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
