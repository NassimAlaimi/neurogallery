"""Ajustement ridge (betas -> embeddings CLIP image/texte), sans dépendance GPU.

Produit `ridge_weights.npz`, chargé par `BrainDiffuserReconstructor`
(`brain_diffuser.py`) : le contrat binaire est `x @ W + b` avec
`x = betas.reshape(1, -1)`. Ce module ne dépend que de numpy/sklearn — les
embeddings CLIP réels (torch/open_clip) sont fournis par `clip_embedder.py`,
importés paresseusement, jamais ici.
"""
from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Protocol

import numpy as np
from sklearn.linear_model import Ridge


def fit_ridge(X: np.ndarray, Y: np.ndarray, alpha: float) -> tuple[np.ndarray, np.ndarray]:
    """Ajuste une régression ridge multi-sortie `X @ W + b ≈ Y`.

    X : [n, p], Y : [n, d]. Renvoie (W [p, d], b [d]) tels que
    `X @ W + b` reproduit `model.predict(X)` de sklearn.
    """
    model = Ridge(alpha=alpha, fit_intercept=True)
    model.fit(X, Y)
    W = model.coef_.T
    b = np.asarray(model.intercept_)
    return W, b


class ClipEmbedder(Protocol):
    def embed_images(self, images: list) -> np.ndarray:
        """images -> embeddings CLIP [n, D_img]."""
        ...

    def embed_texts(self, texts: list[str]) -> np.ndarray:
        """textes -> embeddings CLIP [n, D_txt]."""
        ...


def _rng_from_bytes(data: bytes) -> np.random.Generator:
    # Seed déterministe dérivé d'un hash des octets d'entrée : mêmes octets
    # -> même vecteur, octets différents -> vecteurs (quasi sûrement) différents.
    digest = hashlib.sha256(data).digest()
    seed = int.from_bytes(digest[:8], byteorder="big")
    return np.random.default_rng(seed)


class FakeClipEmbedder:
    """Embedder déterministe sans torch/open_clip — pour les tests unitaires."""

    def __init__(self, dim_image: int = 8, dim_text: int = 4) -> None:
        self._dim_image = dim_image
        self._dim_text = dim_text

    def embed_images(self, images: list) -> np.ndarray:
        vectors = []
        for img in images:
            arr = np.asarray(img)
            rng = _rng_from_bytes(arr.tobytes())
            vectors.append(rng.standard_normal(self._dim_image))
        return np.stack(vectors).astype(np.float64)

    def embed_texts(self, texts: list[str]) -> np.ndarray:
        vectors = []
        for text in texts:
            rng = _rng_from_bytes(text.encode("utf-8"))
            vectors.append(rng.standard_normal(self._dim_text))
        return np.stack(vectors).astype(np.float64)


def fit_from_subject(
    betas_train: np.ndarray,
    images_train: list,
    captions_train: list[str],
    embedder: ClipEmbedder,
    alpha_image: float,
    alpha_text: float,
) -> dict[str, np.ndarray]:
    """Ajuste les deux régressions ridge (betas -> CLIP image/texte) d'un sujet."""
    n_trials = betas_train.shape[0]
    if len(images_train) != n_trials or len(captions_train) != n_trials:
        raise ValueError(
            "betas/images/captions désynchronisés : "
            f"{n_trials} essais, {len(images_train)} images, "
            f"{len(captions_train)} légendes"
        )

    Yimg = embedder.embed_images(images_train)
    Ytxt = embedder.embed_texts(captions_train)

    W_img, b_img = fit_ridge(betas_train, Yimg, alpha_image)
    W_txt, b_txt = fit_ridge(betas_train, Ytxt, alpha_text)

    return {
        "W_clip_image": W_img,
        "b_clip_image": b_img,
        "W_clip_text": W_txt,
        "b_clip_text": b_txt,
    }


def save_ridge_weights(path: Path, weights: dict[str, np.ndarray]) -> None:
    """Écrit les 4 clés attendues par `BrainDiffuserReconstructor` dans un .npz."""
    expected = {"W_clip_image", "b_clip_image", "W_clip_text", "b_clip_text"}
    if set(weights) != expected:
        raise ValueError(f"ridge_weights doit contenir exactement {expected}, reçu {set(weights)}")
    path.parent.mkdir(parents=True, exist_ok=True)
    np.savez(path, **weights)
