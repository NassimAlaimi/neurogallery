"""Chargement des betas subj01 (HDF5) et métadonnées, avec validation aux frontières.

Ne rehéberge jamais les données : lit uniquement des fichiers locaux (cf. Global
Constraints). `make_synthetic_subject` fournit une fixture déterministe pour les tests.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np


@dataclass(frozen=True)
class SubjectData:
    betas: np.ndarray          # [n_trials, n_voxels]
    image_index: np.ndarray    # [n_trials] -> coco index par essai
    test_trial_ids: np.ndarray # [n_test] -> indices des essais de test


def assert_betas_valid(betas: np.ndarray, expected_voxels: int) -> None:
    if betas.ndim != 2:
        raise ValueError(f"betas doit être 2D [n_trials, n_voxels], reçu ndim={betas.ndim}")
    n_voxels = betas.shape[1]
    if n_voxels != expected_voxels:
        raise ValueError(
            f"nombre de voxels inattendu : {n_voxels} != {expected_voxels} attendu "
            "(ROI nsdgeneral subj01)"
        )


def load_subject(betas_path: Path, meta_path: Path, expected_voxels: int) -> SubjectData:
    import h5py  # import local : dépendance lourde, hors des tests purs

    with h5py.File(betas_path, "r") as f:
        betas = np.asarray(f["betas"][:], dtype=np.float32)
    assert_betas_valid(betas, expected_voxels)

    meta = np.load(meta_path)
    image_index = np.asarray(meta["image_index"], dtype=np.int64)
    test_trial_ids = np.asarray(meta["test_trial_ids"], dtype=np.int64)

    if image_index.shape[0] != betas.shape[0]:
        raise ValueError(
            f"cohérence essai→image rompue : {image_index.shape[0]} indices "
            f"pour {betas.shape[0]} essais"
        )
    return SubjectData(betas=betas, image_index=image_index, test_trial_ids=test_trial_ids)


def make_synthetic_subject(
    n_trials: int, n_voxels: int, n_test: int, seed: int
) -> SubjectData:
    rng = np.random.default_rng(seed)
    betas = rng.standard_normal((n_trials, n_voxels)).astype(np.float32)
    image_index = np.arange(n_trials, dtype=np.int64)
    test_trial_ids = np.arange(n_test, dtype=np.int64)
    return SubjectData(betas=betas, image_index=image_index, test_trial_ids=test_trial_ids)
