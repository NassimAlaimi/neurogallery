"""Remplace les cartes d'activité « à plat » par de vraies coupes de cerveau (IRMf).

Replace chaque vecteur betas dans l'espace 3D via le masque de la ROI nsdgeneral,
et compose un montage 2x2 de coupes axiales : anatomie du sujet (mean fonctionnel,
gris) + activité colorée (violet→magenta→cyan) par-dessus, uniquement dans la ROI.

Nécessite (NSD, espace func 1.8mm) dans cfg.data_dir :
  - nsdgeneral.nii.gz  (masque ROI, ~60 Ko)
  - func_mean.nii.gz   (volume moyen, fond anatomique)
  - subj01_meta.npz    (test_betas)

Récupération des NIfTI depuis le S3 public NSD (nsdgeneral + mean) :
  BASE=https://natural-scenes-dataset.s3.amazonaws.com/nsddata/ppdata/subj01/func1pt8mm
  curl -o nsdgeneral.nii.gz "$BASE/roi/nsdgeneral.nii.gz"
  curl -o func_mean.nii.gz  "$BASE/mean.nii.gz"

Usage : python scripts/make_brain_inputs.py --artifact /chemin/vers/artifact_XXXX
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from neurogallery.config import default_config

STOPS = np.array([[0.42, 0.18, 0.9], [0.95, 0.2, 0.75], [0.2, 0.85, 0.95]])
OUT_SIZE = 512


def _colorize(a: np.ndarray) -> np.ndarray:
    xs = np.linspace(0.0, 1.0, len(STOPS))
    return np.stack([np.interp(a, xs, STOPS[:, c]) for c in range(3)], axis=-1)


def _pick_slices(mask: np.ndarray, n: int = 4) -> list[int]:
    per_z = mask.sum(axis=(0, 1))
    zs = np.nonzero(per_z > per_z.max() * 0.15)[0]  # coupes contenant vraiment de la ROI
    if len(zs) <= n:
        return list(zs)
    idx = np.linspace(0, len(zs) - 1, n).round().astype(int)
    return [int(zs[i]) for i in idx]


def render_brain(betas, mask, mean, bg_norm, zs) -> "PILImage":
    from PIL import Image

    vol = np.zeros(mask.shape, np.float32)
    vol[mask] = np.asarray(betas, np.float32)
    lo, hi = np.percentile(betas, [5, 97])
    act = np.clip((vol - lo) / (hi - lo + 1e-8), 0.0, 1.0)

    tiles = []
    for z in zs:
        g = np.rot90(bg_norm[:, :, z])
        m = np.rot90(mask[:, :, z])
        a = np.rot90(act[:, :, z])
        rgb = np.stack([g, g, g], -1) * 0.72
        alpha = (a * 0.92)[..., None] * m[..., None]
        rgb = rgb * (1 - alpha) + _colorize(a) * alpha
        tiles.append(np.clip(rgb, 0, 1))

    h, w, _ = tiles[0].shape
    grid = np.zeros((h * 2, w * 2, 3), np.float32)
    for i, t in enumerate(tiles[:4]):
        grid[(i // 2) * h:(i // 2) * h + h, (i % 2) * w:(i % 2) * w + w] = t
    side = max(grid.shape[0], grid.shape[1])
    sq = np.zeros((side, side, 3), np.float32)
    y0, x0 = (side - grid.shape[0]) // 2, (side - grid.shape[1]) // 2
    sq[y0:y0 + grid.shape[0], x0:x0 + grid.shape[1]] = grid
    return Image.fromarray((sq * 255).astype("uint8")).resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifact", required=True, type=Path)
    args = parser.parse_args()

    import nibabel as nib

    cfg = default_config()
    mask = nib.load(cfg.data_dir / "nsdgeneral.nii.gz").get_fdata() > 0
    mean = nib.load(cfg.data_dir / "func_mean.nii.gz").get_fdata()
    bg_norm = np.clip(mean / np.percentile(mean, 99), 0.0, 1.0)
    zs = _pick_slices(mask, 4)
    test_betas = np.load(cfg.data_dir / "subj01_meta.npz", allow_pickle=True)["test_betas"]

    manifest = json.loads((args.artifact / "manifest.json").read_text())
    (args.artifact / "input").mkdir(exist_ok=True)
    n = 0
    for item in manifest["items"]:
        j = int(item["id"])
        render_brain(test_betas[j], mask, mean, bg_norm, zs).save(args.artifact / f"input/{item['id']}.png")
        item.setdefault("input", f"input/{item['id']}.png")
        n += 1
    (args.artifact / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"Coupes cérébrales générées pour {n} items (coupes z={zs}).")


if __name__ == "__main__":
    main()
