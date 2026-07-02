"""Métriques pures. La séparation math/extraction rend tout testable sans GPU.

Les métriques bas-niveau (pixcorr, ssim) comparent des images.
Les métriques haut-niveau (identification 2-voies) comparent des embeddings
produits par un `FeatureExtractor` (implémenté hors de ce plan, côté GPU).
"""
from __future__ import annotations

from typing import Protocol

import numpy as np
from skimage.metrics import structural_similarity


def pixcorr(a: np.ndarray, b: np.ndarray) -> float:
    """Corrélation de Pearson entre deux images aplaties."""
    x = a.astype(np.float64).ravel()
    y = b.astype(np.float64).ravel()
    if x.std() == 0 or y.std() == 0:
        return 0.0
    return float(np.corrcoef(x, y)[0, 1])


def ssim_score(a: np.ndarray, b: np.ndarray) -> float:
    """SSIM. Images HxW (gris) ou HxWxC (couleur), mêmes dimensions."""
    channel_axis = 2 if a.ndim == 3 else None
    data_range = float(max(a.max(), b.max()) - min(a.min(), b.min())) or 1.0
    return float(
        structural_similarity(a, b, channel_axis=channel_axis, data_range=data_range)
    )


def cosine_similarity(u: np.ndarray, v: np.ndarray) -> float:
    u = u.astype(np.float64).ravel()
    v = v.astype(np.float64).ravel()
    nu, nv = np.linalg.norm(u), np.linalg.norm(v)
    if nu == 0 or nv == 0:
        return 0.0
    return float(np.dot(u, v) / (nu * nv))


def two_way_identification(
    recon_emb: np.ndarray, gt_emb: np.ndarray, distractor_emb: np.ndarray
) -> bool:
    """True si la reconstruction ressemble plus à la vraie image qu'au distracteur."""
    return cosine_similarity(recon_emb, gt_emb) > cosine_similarity(
        recon_emb, distractor_emb
    )


class FeatureExtractor(Protocol):
    """Interface pour les extracteurs de features lourds (AlexNet/CLIP/EfficientNet).

    Implémentations concrètes = côté GPU, hors de ce plan. `embed` renvoie un
    vecteur 1-D. Cette séparation garde les métriques ci-dessus pures et testables.
    """

    def embed(self, image: np.ndarray) -> np.ndarray: ...
