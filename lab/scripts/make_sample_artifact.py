"""Génère un artefact-échantillon schema-valide pour le dev/test de l'app.

Sorties = FakeReconstructor (nos propres images) + vérités-terrain SYNTHÉTIQUES
(dégradés générés) — aucune donnée NSD/COCO réelle. Profil public : les GT à
licence non affichable sont masquées, exactement comme en prod.

Usage : python lab/scripts/make_sample_artifact.py
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

from neurogallery.build.artifact import BuildItem, build_artifact
from neurogallery.config import LabConfig
from neurogallery.reconstruct.fake import FakeReconstructor

OUT_DIR = Path(__file__).resolve().parents[2] / "app" / "public" / "sample-artifact"
# licences mixtes : 4=CC BY (affichable), 7=no-known (affichable), 2=NC (masquée), 3=NC-ND (masquée)
LICENSES = [4, 7, 2, 4, 3, 7, 2, 4]
CATEGORIES = ["animal", "paysage", "objet", "personne", "nourriture", "véhicule", "animal", "objet"]


def _synthetic_gt(seed: int) -> Image.Image:
    rng = np.random.default_rng(seed)
    base = rng.integers(0, 255, size=(64, 64, 3), dtype=np.uint8)
    return Image.fromarray(base)


def main() -> None:
    n = len(LICENSES)
    coco_index = {
        1000 + i: {"license_id": LICENSES[i], "flickr_url": f"https://example.org/{i}"}
        for i in range(n)
    }
    items = [
        BuildItem(
            id=f"{i:04d}",
            coco_id=1000 + i,
            category=CATEGORIES[i],
            betas=np.full(50, float(i), dtype=np.float32),
            gt_image=_synthetic_gt(i),
        )
        for i in range(n)
    ]
    cfg = LabConfig(data_dir=OUT_DIR.parent, artifact_root=OUT_DIR.parent)
    build_artifact(
        cfg=cfg,
        reconstructor=FakeReconstructor(size=256),
        method="brain-diffuser",
        items=items,
        coco_index=coco_index,
        profile="public",
        out_dir=OUT_DIR,
    )
    print(f"Artefact-échantillon écrit : {OUT_DIR}")


if __name__ == "__main__":
    main()
