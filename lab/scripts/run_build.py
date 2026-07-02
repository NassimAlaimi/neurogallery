"""Assemble les BuildItem du set de test et lance build_artifact.

Usage : python lab/scripts/run_build.py --method brain-diffuser --profile local --limit 50
"""
from __future__ import annotations

import argparse
import datetime as dt
from pathlib import Path

import numpy as np
from PIL import Image

from neurogallery.build.artifact import BuildItem, build_artifact
from neurogallery.config import default_config
from neurogallery.data.load import load_subject
from neurogallery.reconstruct.brain_diffuser import BrainDiffuserReconstructor


def _load_coco_index(cfg) -> dict[int, dict]:
    # Chargé depuis les annotations COCO locales : coco_id -> {license_id, flickr_url}.
    import json
    idx: dict[int, dict] = {}
    ann_path = cfg.data_dir / "coco_annotations.json"
    data = json.loads(ann_path.read_text())
    for img in data["images"]:
        idx[int(img["id"])] = {"license_id": int(img["license"]),
                               "flickr_url": img.get("flickr_url")}
    return idx


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--method", choices=["brain-diffuser"], default="brain-diffuser")
    parser.add_argument("--profile", choices=["local", "public"], default="local")
    parser.add_argument("--limit", type=int, default=50)
    args = parser.parse_args()

    cfg = default_config()
    data = load_subject(
        betas_path=cfg.data_dir / "betas_all_subj01_fp32_renorm.hdf5",
        meta_path=cfg.data_dir / f"{cfg.subject}_meta.npz",
        expected_voxels=cfg.expected_voxels,
    )
    coco_index = _load_coco_index(cfg)
    images_h5 = cfg.data_dir / "coco_images_224_float16.hdf5"

    import h5py
    items: list[BuildItem] = []
    with h5py.File(images_h5, "r") as f:
        images = f["images"]
        for trial_id in data.test_trial_ids[: args.limit]:
            coco_id = int(data.image_index[trial_id])
            arr = (np.asarray(images[trial_id]) * 255).astype("uint8")
            gt = Image.fromarray(np.moveaxis(arr, 0, -1)) if arr.shape[0] == 3 else Image.fromarray(arr)
            items.append(BuildItem(id=f"{int(trial_id):04d}", coco_id=coco_id,
                                   category=None, betas=data.betas[trial_id], gt_image=gt))

    reconstructor = BrainDiffuserReconstructor(cfg, cfg.data_dir / "brain-diffuser-weights")
    stamp = dt.datetime.now(dt.UTC).strftime("%Y%m%d-%H%M%S")
    out_dir = cfg.artifact_root / f"artifact_{stamp}"
    result = build_artifact(cfg=cfg, reconstructor=reconstructor, method=args.method,
                            items=items, coco_index=coco_index, profile=args.profile,
                            out_dir=out_dir)
    print(f"artefact écrit : {result}")


if __name__ == "__main__":
    main()
