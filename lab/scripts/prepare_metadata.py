"""Prépare les métadonnées subj01 pour fit_ridge / run_build (comble l'Étape 2).

Reconstruit, à partir des webdatasets `wds/subj01/{train,test}` de mindeyev2, le
mapping essai(ligne de betas) -> index image 73k, puis :
  - train_rows / train_73k : lignes de betas d'entraînement + leur index 73k ;
  - test_73k               : les 982 images de test (shared1000 vues par subj01) ;
  - test_betas             : betas de test moyennées sur les répétitions (982 x 15724).

Les captions (cibles texte du ridge) viennent de `subj01_annots.npy` (alignées sur
les lignes de betas) ; les catégories de `COCO_73k_semantic_cluster.npy` (indexées 73k).
Ces deux .npy sont lus directement par les scripts consommateurs.

Colonnes behav vérifiées empiriquement : col 0 = index image 73k, col 5 = ligne de betas.

Usage : python scripts/prepare_metadata.py
"""
from __future__ import annotations

import io
import tarfile
from pathlib import Path

import numpy as np

from neurogallery.config import default_config

N_TRIALS = 30000
BEHAV_IMG_COL = 0   # index image 73k
BEHAV_ROW_COL = 5   # ligne dans le hdf5 des betas


def _read_behav_tar(tar_path: Path) -> tuple[np.ndarray, np.ndarray]:
    rows, k73 = [], []
    with tarfile.open(tar_path) as t:
        for name in t.getnames():
            # uniquement les membres "*.behav.npy" (pas future/olds/past_behav)
            if name.endswith(".behav.npy") and name.count("behav") == 1:
                arr = np.load(io.BytesIO(t.extractfile(name).read()))
                k73.append(int(arr[0, BEHAV_IMG_COL]))
                rows.append(int(arr[0, BEHAV_ROW_COL]))
    return np.asarray(rows, dtype=np.int64), np.asarray(k73, dtype=np.int64)


def _build_row_mapping(wds_dir: Path) -> tuple[np.ndarray, np.ndarray]:
    """Renvoie (row2k, split) de taille N_TRIALS ; split: 0=train, 1=test, -1=inutilisé."""
    row2k = np.full(N_TRIALS, -1, dtype=np.int64)
    split = np.full(N_TRIALS, -1, dtype=np.int8)

    train_tars = sorted((wds_dir / "train").glob("*.tar"),
                        key=lambda p: int(p.stem))
    if not train_tars:
        raise FileNotFoundError(f"aucun tar d'entraînement sous {wds_dir/'train'}")
    for tp in train_tars:
        r, k = _read_behav_tar(tp)
        row2k[r] = k
        split[r] = 0

    test_tar = wds_dir / "test" / "0.tar"
    if not test_tar.exists():
        raise FileNotFoundError(f"tar de test introuvable : {test_tar}")
    r, k = _read_behav_tar(test_tar)
    row2k[r] = k
    split[r] = 1
    return row2k, split


def _average_betas_by_image(
    betas_path: Path, rows: np.ndarray, row_73k: np.ndarray
) -> tuple[np.ndarray, np.ndarray]:
    """Moyenne les betas des répétitions par image.

    Renvoie (73k uniques triés, betas moyennées [n_images, n_voxels])."""
    import h5py

    with h5py.File(betas_path, "r") as f:
        order = np.argsort(rows)                       # h5py exige un index croissant
        betas = np.asarray(f["betas"][rows[order], :], dtype=np.float32)
    k73_sorted = row_73k[order]

    uniq = np.unique(k73_sorted)
    out = np.zeros((uniq.size, betas.shape[1]), dtype=np.float32)
    for i, k in enumerate(uniq):
        out[i] = betas[k73_sorted == k].mean(axis=0)
    return uniq, out


def _first_caption_per_image(
    rows: np.ndarray, row_73k: np.ndarray, uniq_73k: np.ndarray, annots: np.ndarray
) -> np.ndarray:
    """Une caption par image (celle de la 1re occurrence de l'image dans les lignes)."""
    first_row: dict[int, int] = {}
    for r, k in zip(rows.tolist(), row_73k.tolist()):
        if k not in first_row:
            first_row[k] = r
    return np.asarray([annots[first_row[int(k)]] for k in uniq_73k], dtype=object)


def main() -> None:
    cfg = default_config()
    data_dir = cfg.data_dir
    wds_dir = data_dir / "wds" / "subj01"
    betas_path = data_dir / "betas_all_subj01_fp32_renorm.hdf5"

    row2k, split = _build_row_mapping(wds_dir)
    covered = int((split >= 0).sum())
    print(f"lignes couvertes : {covered}/{N_TRIALS} "
          f"(train={int((split==0).sum())}, test={int((split==1).sum())})")

    annots = np.load(data_dir / "subj01_annots.npy", allow_pickle=True)  # caption par ligne

    train_rows = np.nonzero(split == 0)[0].astype(np.int64)
    train_row_73k = row2k[train_rows]
    train_73k, train_betas = _average_betas_by_image(betas_path, train_rows, train_row_73k)
    train_caption = _first_caption_per_image(train_rows, train_row_73k, train_73k, annots)

    test_rows = np.nonzero(split == 1)[0].astype(np.int64)
    test_row_73k = row2k[test_rows]
    test_73k, test_betas = _average_betas_by_image(betas_path, test_rows, test_row_73k)

    # contrôles d'intégrité
    shared = np.load(data_dir / "shared1000.npy")
    assert shared[train_73k].mean() == 0.0, "des images d'entraînement sont dans shared1000"
    assert shared[test_73k].mean() == 1.0, "des images de test sont hors shared1000"
    assert not np.isnan(train_betas).any() and not np.isnan(test_betas).any(), "NaN dans betas"
    assert set(train_73k.tolist()).isdisjoint(set(test_73k.tolist())), "train/test 73k se chevauchent"

    out = data_dir / "subj01_meta.npz"
    np.savez(
        out,
        train_73k=train_73k,
        train_betas=train_betas,
        train_caption=train_caption,
        test_73k=test_73k,
        test_betas=test_betas,
    )
    print(f"écrit : {out}")
    print(f"  train : {train_73k.size} images (betas moyennées {train_betas.shape})")
    print(f"  test  : {test_73k.size} images (betas moyennées {test_betas.shape})")


if __name__ == "__main__":
    main()
