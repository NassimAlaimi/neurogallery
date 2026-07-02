"""Tests de l'ajustement ridge (betas -> embeddings CLIP), sans GPU/torch."""
from __future__ import annotations

import numpy as np
import pytest

from neurogallery.reconstruct.ridge_fit import (
    FakeClipEmbedder,
    fit_from_subject,
    fit_ridge,
    save_ridge_weights,
)


def test_fit_ridge_recovers_known_linear_map():
    rng = np.random.default_rng(0)
    X = rng.standard_normal((40, 5)).astype(np.float64)
    W_true = rng.standard_normal((5, 3))
    b_true = rng.standard_normal(3)
    Y = X @ W_true + b_true

    W_fit, b_fit = fit_ridge(X, Y, alpha=1e-6)

    assert W_fit.shape == (5, 3)
    assert b_fit.shape == (3,)
    assert np.allclose(X @ W_fit + b_fit, Y, atol=1e-3)


def test_fit_ridge_alpha_shrinks_weights():
    rng = np.random.default_rng(1)
    X = rng.standard_normal((40, 5))
    W_true = rng.standard_normal((5, 3))
    b_true = rng.standard_normal(3)
    Y = X @ W_true + b_true + 0.01 * rng.standard_normal((40, 3))

    W_small_alpha, _ = fit_ridge(X, Y, alpha=1e-6)
    W_large_alpha, _ = fit_ridge(X, Y, alpha=1e3)

    assert np.linalg.norm(W_large_alpha) < np.linalg.norm(W_small_alpha)


def test_fit_from_subject_shapes_and_keys():
    rng = np.random.default_rng(2)
    betas = rng.standard_normal((10, 50)).astype(np.float32)
    images = [np.zeros((4, 4, 3), dtype=np.uint8) + i for i in range(10)]
    captions = [f"caption {i}" for i in range(10)]
    embedder = FakeClipEmbedder(dim_image=8, dim_text=4)

    weights = fit_from_subject(
        betas_train=betas,
        images_train=images,
        captions_train=captions,
        embedder=embedder,
        alpha_image=1.0,
        alpha_text=1.0,
    )

    assert set(weights.keys()) == {
        "W_clip_image", "b_clip_image", "W_clip_text", "b_clip_text",
    }
    assert weights["W_clip_image"].shape == (50, 8)
    assert weights["b_clip_image"].shape == (8,)
    assert weights["W_clip_text"].shape == (50, 4)
    assert weights["b_clip_text"].shape == (4,)


def test_fit_from_subject_rejects_length_mismatch():
    rng = np.random.default_rng(3)
    betas = rng.standard_normal((10, 50)).astype(np.float32)
    images = [np.zeros((4, 4, 3), dtype=np.uint8)] * 10
    captions = [f"caption {i}" for i in range(9)]  # mismatch délibéré
    embedder = FakeClipEmbedder(dim_image=8, dim_text=4)

    with pytest.raises(ValueError):
        fit_from_subject(
            betas_train=betas,
            images_train=images,
            captions_train=captions,
            embedder=embedder,
            alpha_image=1.0,
            alpha_text=1.0,
        )


def test_saved_weights_satisfy_wrapper_contract(tmp_path):
    rng = np.random.default_rng(4)
    betas = rng.standard_normal((10, 50)).astype(np.float32)
    images = [np.zeros((4, 4, 3), dtype=np.uint8) + i for i in range(10)]
    captions = [f"caption {i}" for i in range(10)]
    embedder = FakeClipEmbedder(dim_image=8, dim_text=4)

    weights = fit_from_subject(
        betas_train=betas,
        images_train=images,
        captions_train=captions,
        embedder=embedder,
        alpha_image=1.0,
        alpha_text=1.0,
    )

    out_path = tmp_path / "brain-diffuser-weights" / "ridge_weights.npz"
    save_ridge_weights(out_path, weights)

    data = np.load(out_path)
    # Simule exactement `BrainDiffuserReconstructor._predict_latents`.
    x = np.zeros((1, 50), dtype=np.float32)
    clip_image = x @ data["W_clip_image"] + data["b_clip_image"]
    clip_text = x @ data["W_clip_text"] + data["b_clip_text"]

    assert clip_image.shape == (1, 8)
    assert clip_text.shape == (1, 4)
