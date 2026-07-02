"""Ajuste les régressions ridge (betas -> CLIP image/texte) et écrit ridge_weights.npz.

Fournit le fichier consommé par `BrainDiffuserReconstructor` (poids absents tant
que ce script n'a pas tourné — voir spec §3.2). Utilise les essais TRAIN
(ceux qui ne sont pas dans test_trial_ids), les images COCO correspondantes et
leurs légendes.

Usage : python lab/scripts/fit_ridge.py [--alpha-image 1.0] [--alpha-text 1.0]

Nécessite un GPU (OpenCLIP) — les imports lourds sont chargés paresseusement
dans main(), jamais au niveau module.
"""
from __future__ import annotations

import argparse
import json

import numpy as np

from neurogallery.config import default_config
from neurogallery.data.load import load_subject
from neurogallery.reconstruct.ridge_fit import fit_from_subject, save_ridge_weights


def _load_coco_captions(cfg) -> dict[int, str]:
    # Légendes COCO locales : coco_id -> première légende trouvée.
    # Schéma attendu : coco_annotations.json contient une clé "annotations"
    # avec des entrées {"image_id": ..., "caption": ...} (format captions
    # COCO standard). À confirmer contre le fichier réel une fois téléchargé
    # (cf. scripts/acquire_data.py) — voir aussi la note de brain_diffuser.py.
    ann_path = cfg.data_dir / "coco_annotations.json"
    data = json.loads(ann_path.read_text())
    captions: dict[int, str] = {}
    for ann in data.get("annotations", []):
        image_id = int(ann["image_id"])
        if image_id not in captions:
            captions[image_id] = str(ann["caption"])
    return captions


def _load_train_images(cfg, trial_ids: np.ndarray):
    import h5py
    from PIL import Image

    images_h5 = cfg.data_dir / "coco_images_224_float16.hdf5"
    images = []
    with h5py.File(images_h5, "r") as f:
        dataset = f["images"]
        for trial_id in trial_ids:
            arr = (np.asarray(dataset[int(trial_id)]) * 255).astype("uint8")
            img = Image.fromarray(np.moveaxis(arr, 0, -1)) if arr.shape[0] == 3 else Image.fromarray(arr)
            images.append(img)
    return images


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--alpha-image", type=float, default=1.0)
    parser.add_argument("--alpha-text", type=float, default=1.0)
    args = parser.parse_args()

    from neurogallery.reconstruct.clip_embedder import OpenClipEmbedder

    cfg = default_config()
    data = load_subject(
        betas_path=cfg.data_dir / f"betas_all_{cfg.subject}_fp32_renorm.hdf5",
        meta_path=cfg.data_dir / f"{cfg.subject}_meta.npz",
        expected_voxels=cfg.expected_voxels,
    )

    train_trial_ids = np.setdiff1d(
        np.arange(data.betas.shape[0]), data.test_trial_ids, assume_unique=False
    )
    betas_train = data.betas[train_trial_ids]

    images_train = _load_train_images(cfg, train_trial_ids)
    captions_by_coco_id = _load_coco_captions(cfg)
    captions_train = [
        captions_by_coco_id[int(data.image_index[trial_id])] for trial_id in train_trial_ids
    ]

    embedder = OpenClipEmbedder()
    weights = fit_from_subject(
        betas_train=betas_train,
        images_train=images_train,
        captions_train=captions_train,
        embedder=embedder,
        alpha_image=args.alpha_image,
        alpha_text=args.alpha_text,
    )

    out_path = cfg.data_dir / "brain-diffuser-weights" / "ridge_weights.npz"
    save_ridge_weights(out_path, weights)
    print(f"poids ridge écrits : {out_path}")
    print("Rappel : lire les Terms & Conditions NSD avant toute publication (spec §8).")


if __name__ == "__main__":
    main()
