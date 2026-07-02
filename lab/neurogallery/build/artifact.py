"""Orchestration : items -> artefact (recon, thumbs, gt, manifest, résumé).

Idempotent/reprenable, immuable (n'écrase pas un png déjà produit), valide le
manifest contre le schéma avant écriture (fail fast). Voir spec §3.4 / §4.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

from neurogallery.build.schema import validate_manifest
from neurogallery.config import LabConfig
from neurogallery.licensing.resolve import resolve_gt_license
from neurogallery.metrics.core import pixcorr, ssim_score
from neurogallery.reconstruct.base import Reconstructor


@dataclass(frozen=True)
class BuildItem:
    id: str
    coco_id: int
    category: str | None
    betas: np.ndarray
    gt_image: Image.Image | None


def _compute_metrics(recon: Image.Image, gt: Image.Image | None) -> dict[str, float]:
    if gt is None:
        return {}
    recon_arr = np.asarray(recon.convert("RGB"), dtype=np.float32) / 255.0
    gt_resized = gt.convert("RGB").resize(recon.size)
    gt_arr = np.asarray(gt_resized, dtype=np.float32) / 255.0
    return {"pixcorr": pixcorr(recon_arr, gt_arr), "ssim": ssim_score(recon_arr, gt_arr)}


def _build_one_item(
    item: BuildItem, reconstructor: Reconstructor, method: str,
    coco_index: dict[int, dict], profile: str, out_dir: Path, thumb_size: int,
) -> dict:
    recon_rel = f"recon/{item.id}_{method}.png"
    recon_path = out_dir / recon_rel
    if recon_path.exists():                       # reprise : réutiliser l'existant
        recon_img = Image.open(recon_path).convert("RGB")
    else:
        recon_img = reconstructor.reconstruct(item.betas).convert("RGB")
        recon_path.parent.mkdir(parents=True, exist_ok=True)
        recon_img.save(recon_path)

    thumb_rel = f"thumbs/{item.id}.jpg"
    thumb_path = out_dir / thumb_rel
    if not thumb_path.exists():
        thumb_path.parent.mkdir(parents=True, exist_ok=True)
        thumb = recon_img.copy()
        thumb.thumbnail((thumb_size, thumb_size))
        thumb.save(thumb_path, "JPEG", quality=85)

    lic = resolve_gt_license(item.coco_id, coco_index)
    show_gt = item.gt_image is not None and (profile == "local" or lic.displayable)
    gt_rel: str | None = None
    if show_gt:
        gt_rel = f"gt/{item.id}.jpg"
        gt_path = out_dir / gt_rel
        if not gt_path.exists():
            gt_path.parent.mkdir(parents=True, exist_ok=True)
            item.gt_image.convert("RGB").save(gt_path, "JPEG", quality=90)
    else:
        # garantie légale : purger tout gt/<id>.jpg laissé par un build antérieur
        # (ex. profil "local" réutilisant le même out_dir) pour éviter la fuite
        # d'une image non affichable lors de la publication du profil "public".
        stale_gt_path = out_dir / f"gt/{item.id}.jpg"
        if stale_gt_path.exists():
            stale_gt_path.unlink()

    metrics = _compute_metrics(recon_img, item.gt_image)

    return {
        "id": item.id,
        "coco_id": item.coco_id,
        "category": item.category,
        "recon": {method: recon_rel},
        "thumb": thumb_rel,
        "gt": {
            "displayable": bool(lic.displayable),
            "path": gt_rel,
            "license_name": lic.license_name,
            "attribution": lic.attribution,
            "source_url": lic.source_url,
        },
        "metrics": {method: metrics},
    }


def _summarize(items: list[dict], method: str) -> dict:
    keys = ["pixcorr", "ssim"]
    means: dict[str, float] = {}
    for k in keys:
        vals = [it["metrics"][method][k] for it in items if k in it["metrics"].get(method, {})]
        if vals:
            means[k] = float(np.mean(vals))
    return {method: means}


def build_artifact(
    cfg: LabConfig,
    reconstructor: Reconstructor,
    method: str,
    items: list[BuildItem],
    coco_index: dict[int, dict],
    profile: str,
    out_dir: Path,
) -> Path:
    if method not in ("brain-diffuser", "mindeye2"):
        raise ValueError(f"méthode inconnue : {method}")
    if profile not in ("local", "public"):
        raise ValueError(f"profil inconnu : {profile}")

    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_items = [
        _build_one_item(it, reconstructor, method, coco_index, profile, out_dir, cfg.thumb_size)
        for it in items
    ]

    manifest = {
        "build": {
            "subject": cfg.subject,
            "test_set": cfg.test_set,
            "methods": [method],
            "profile": profile,
        },
        "items": manifest_items,
    }
    validate_manifest(manifest)  # fail fast avant écriture

    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (out_dir / "metrics_summary.json").write_text(
        json.dumps(_summarize(manifest_items, method), indent=2), encoding="utf-8"
    )
    return out_dir
