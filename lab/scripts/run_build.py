"""Construit l'artefact de reconstructions sur le set de test subj01 (982 images).

Consomme `subj01_meta.npz` (test_73k + test_betas moyennées) + `ridge_weights.npz`
(cf. fit_ridge.py) + les images COCO. Chaque image de test est reconstruite via
BrainDiffuserReconstructor. GPU + Versatile Diffusion requis.

Usage : python scripts/run_build.py [--profile local|public --limit N]

Profil `local` : toutes les vérités-terrain affichées (aucun mapping licence requis).
Profil `public` : nécessite le mapping index-73k -> cocoId + licences COCO (Stage B,
pas encore câblé — lance `local` pour un premier run).
"""
from __future__ import annotations

import argparse
import datetime as dt

import numpy as np

from neurogallery.build.artifact import BuildItem, build_artifact
from neurogallery.config import default_config
from neurogallery.reconstruct.brain_diffuser import BrainDiffuserReconstructor


def _decode_image(images_dset, k: int):
    """Image COCO du hdf5 (CHW float16 [0,1]) -> PIL.Image."""
    from PIL import Image

    arr = np.asarray(images_dset[int(k)])
    hwc = np.clip(np.moveaxis(arr, 0, -1), 0.0, 1.0)
    return Image.fromarray((hwc * 255).astype("uint8"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--profile", choices=["local", "public"], default="local")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    if args.profile == "public":
        raise SystemExit(
            "Profil public non câblé : il faut d'abord le mapping index-73k -> cocoId "
            "+ les licences COCO (Stage B). Utilise --profile local pour l'instant."
        )

    cfg = default_config()
    meta = np.load(cfg.data_dir / "subj01_meta.npz", allow_pickle=True)
    test_73k = meta["test_73k"]
    test_betas = meta["test_betas"]
    if args.limit:
        test_73k = test_73k[: args.limit]
        test_betas = test_betas[: args.limit]

    clusters = np.load(cfg.data_dir / "COCO_73k_semantic_cluster.npy", allow_pickle=True)

    import h5py  # dépendance lourde, import local

    print(f"préparation de {len(test_73k)} items de test…")
    items: list[BuildItem] = []
    with h5py.File(cfg.data_dir / "coco_images_224_float16.hdf5", "r") as f:
        dset = f["images"]
        for i, k in enumerate(test_73k):
            category = str(clusters[int(k)]).replace("photo of ", "")
            items.append(
                BuildItem(
                    id=f"{i:04d}",
                    coco_id=int(k),          # index 73k (placeholder ; vrai cocoId = Stage B)
                    category=category,
                    betas=test_betas[i],
                    gt_image=_decode_image(dset, k),
                )
            )

    print("chargement de Versatile Diffusion + reconstruction…")
    reconstructor = BrainDiffuserReconstructor(cfg, cfg.data_dir / "brain-diffuser-weights")
    stamp = dt.datetime.now(dt.UTC).strftime("%Y%m%d-%H%M%S")
    out_dir = cfg.artifact_root / f"artifact_{stamp}"
    result = build_artifact(
        cfg=cfg, reconstructor=reconstructor, method="brain-diffuser",
        items=items, coco_index={}, profile="local", out_dir=out_dir,
    )
    print(f"artefact écrit : {result}")
    print("Copie dans l'app :  rm -rf app/public/sample-artifact && "
          f"cp -r {result} app/public/sample-artifact")


if __name__ == "__main__":
    main()
