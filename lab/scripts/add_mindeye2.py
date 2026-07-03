"""Ajoute les reconstructions MindEye2 *pré-calculées* (officielles, subj01) à un artefact.

Réutilise plutôt que recalculer : le dataset mindeyev2 fournit les reconstructions
MindEye2 (SOTA) de subj01 sur le set de test partagé. On les ingère comme méthode
`mindeye2` dans un artefact existant (recons + métriques), on régénère les vignettes
depuis MindEye2 (galerie), et on met mindeye2 en tête des méthodes (affichage par défaut).

Aucun calcul lourd : simple mapping par index image 73k. GPU non requis.

Usage : python scripts/add_mindeye2.py --artifact /chemin/vers/artifact_XXXX
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from neurogallery.build.schema import validate_manifest
from neurogallery.config import default_config
from neurogallery.metrics.core import pixcorr, ssim_score

RECONS_FILE = "evals/final_subj01_pretrained_40sess_24bs/final_subj01_pretrained_40sess_24bs_all_recons.pt"
ENHANCED_FILE = "evals/final_subj01_pretrained_40sess_24bs/final_subj01_pretrained_40sess_24bs_all_enhancedrecons.pt"
THUMB_SIZE = 256


def _to_pil(chw_float):
    from PIL import Image

    arr = np.clip(np.moveaxis(chw_float, 0, -1), 0.0, 1.0)  # (H,W,3) [0,1]
    return Image.fromarray((arr * 255).astype("uint8"))


_METRIC_SIZE = (256, 256)  # taille commune : rapide et comparable entre méthodes


def _metrics(recon_img, gt_img) -> dict[str, float]:
    r = np.asarray(recon_img.convert("RGB").resize(_METRIC_SIZE), dtype=np.float32) / 255.0
    g = np.asarray(gt_img.convert("RGB").resize(_METRIC_SIZE), dtype=np.float32) / 255.0
    return {"pixcorr": pixcorr(r, g), "ssim": ssim_score(r, g)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifact", required=True, type=Path)
    parser.add_argument("--enhanced", action="store_true",
                        help="utiliser les recons 'enhanced' (raffinées, fidélité max)")
    args = parser.parse_args()

    import torch
    from PIL import Image

    cfg = default_config()
    recons_file = ENHANCED_FILE if args.enhanced else RECONS_FILE
    recons = torch.load(cfg.data_dir / recons_file, map_location="cpu")   # [1000,3,H,W]
    test73_1000 = np.load(cfg.data_dir / "test_73k_images.npy")           # ordre des recons
    pos_by_73k = {int(k): i for i, k in enumerate(test73_1000)}
    meta = np.load(cfg.data_dir / "subj01_meta.npz", allow_pickle=True)
    our_test_73k = meta["test_73k"]

    art = args.artifact
    manifest = json.loads((art / "manifest.json").read_text())
    (art / "recon").mkdir(exist_ok=True)

    added = 0
    for item in manifest["items"]:
        j = int(item["id"])                       # id "0000" <-> our_test_73k[0]
        k73 = int(our_test_73k[j])
        i = pos_by_73k[k73]                        # position dans les recons MindEye2
        recon_img = _to_pil(recons[i].numpy())

        rel = f"recon/{item['id']}_mindeye2.png"
        recon_img.save(art / rel)
        item["recon"]["mindeye2"] = rel

        # métriques + vignette (depuis MindEye2, pour la galerie)
        gt_rel = item["gt"].get("path")
        if gt_rel:
            gt_img = Image.open(art / gt_rel)
            item.setdefault("metrics", {})["mindeye2"] = _metrics(recon_img, gt_img)
        thumb = recon_img.copy()
        thumb.thumbnail((THUMB_SIZE, THUMB_SIZE))
        thumb.save(art / item["thumb"], "JPEG", quality=85)
        added += 1

    # mindeye2 en tête -> méthode affichée par défaut ; brain-diffuser en comparaison
    methods = manifest["build"]["methods"]
    manifest["build"]["methods"] = ["mindeye2"] + [m for m in methods if m != "mindeye2"]

    validate_manifest(manifest)
    (art / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"MindEye2 ajouté à {added} items ; méthodes = {manifest['build']['methods']}")


if __name__ == "__main__":
    main()
