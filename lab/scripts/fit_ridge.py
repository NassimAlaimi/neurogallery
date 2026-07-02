"""Ajuste les régressions ridge betas->embeddings CLIP (produit ridge_weights.npz).

Consomme `subj01_meta.npz` (cf. prepare_metadata.py) : entraîne sur les ~9000 images
d'entraînement (betas moyennées par image) → embeddings CLIP image (des stimuli) et
texte (des captions fournies dans le meta). GPU + open_clip requis.

Usage : python scripts/fit_ridge.py [--alpha-image 60000 --alpha-text 60000 --limit N]

Imports lourds chargés paresseusement dans main().
"""
from __future__ import annotations

import argparse

import numpy as np

from neurogallery.config import default_config
from neurogallery.reconstruct.ridge_fit import fit_from_subject, save_ridge_weights


def _decode_images(images_dset, indices: np.ndarray) -> list:
    """Images COCO du hdf5 (CHW float16 [0,1]) -> liste de PIL.Image (pour open_clip)."""
    from PIL import Image

    out = []
    for k in indices:
        arr = np.asarray(images_dset[int(k)])              # (3, 224, 224) float16
        hwc = np.clip(np.moveaxis(arr, 0, -1), 0.0, 1.0)   # -> (224, 224, 3)
        out.append(Image.fromarray((hwc * 255).astype("uint8")))
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--alpha-image", type=float, default=60000.0)
    parser.add_argument("--alpha-text", type=float, default=60000.0)
    parser.add_argument("--limit", type=int, default=None,
                        help="limiter le nb d'images d'entraînement (débogage)")
    args = parser.parse_args()

    cfg = default_config()
    meta = np.load(cfg.data_dir / "subj01_meta.npz", allow_pickle=True)
    train_73k = meta["train_73k"]
    train_betas = meta["train_betas"]
    train_caption = meta["train_caption"]
    if args.limit:
        train_73k = train_73k[: args.limit]
        train_betas = train_betas[: args.limit]
        train_caption = train_caption[: args.limit]

    import h5py  # dépendance lourde, import local

    from neurogallery.reconstruct.clip_embedder import OpenClipEmbedder

    print(f"chargement de {len(train_73k)} images d'entraînement…")
    with h5py.File(cfg.data_dir / "coco_images_224_float16.hdf5", "r") as f:
        images = _decode_images(f["images"], train_73k)
    captions = [str(c) for c in train_caption]

    print("extraction des embeddings CLIP + ajustement ridge…")
    embedder = OpenClipEmbedder()
    weights = fit_from_subject(
        train_betas, images, captions, embedder,
        alpha_image=args.alpha_image, alpha_text=args.alpha_text,
    )

    out = cfg.data_dir / "brain-diffuser-weights" / "ridge_weights.npz"
    save_ridge_weights(out, weights)
    print("écrit :", out, {k: tuple(v.shape) for k, v in weights.items()})
    print("Rappel : lire les Terms & Conditions NSD avant toute publication.")


if __name__ == "__main__":
    main()
