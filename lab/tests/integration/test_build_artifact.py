import json
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from neurogallery.build.artifact import BuildItem, build_artifact
from neurogallery.build.schema import validate_manifest
from neurogallery.config import LabConfig
from neurogallery.reconstruct.fake import FakeReconstructor


def _make_items(n: int) -> list[BuildItem]:
    items = []
    for i in range(n):
        gt = Image.new("RGB", (64, 64), (i * 10 % 256, 0, 0))
        items.append(
            BuildItem(
                id=f"{i:04d}",
                coco_id=100 + i,
                category="animal",
                betas=np.full(50, float(i), dtype=np.float32),
                gt_image=gt,
            )
        )
    return items


COCO_INDEX = {
    100: {"license_id": 4, "flickr_url": "https://flickr.com/a"},   # affichable
    101: {"license_id": 2, "flickr_url": "https://flickr.com/b"},   # NON affichable
    102: {"license_id": 7, "flickr_url": "https://flickr.com/c"},   # affichable
}


def _cfg(tmp_path: Path) -> LabConfig:
    return LabConfig(data_dir=tmp_path / "data", artifact_root=tmp_path / "art")


def test_build_produces_valid_manifest_local(tmp_path):
    out = tmp_path / "artifact"
    result = build_artifact(
        cfg=_cfg(tmp_path),
        reconstructor=FakeReconstructor(size=64),
        method="brain-diffuser",
        items=_make_items(3),
        coco_index=COCO_INDEX,
        profile="local",
        out_dir=out,
    )
    assert result == out
    manifest = json.loads((out / "manifest.json").read_text())
    validate_manifest(manifest)  # ne doit rien lever
    assert manifest["build"]["profile"] == "local"
    assert len(manifest["items"]) == 3
    # profil local : toutes les vérités-terrain présentes
    for item in manifest["items"]:
        assert item["gt"]["path"] is not None
        assert (out / item["recon"]["brain-diffuser"]).exists()
        assert (out / item["thumb"]).exists()
        assert (out / item["gt"]["path"]).exists()
    # métriques calculées
    assert "pixcorr" in manifest["items"][0]["metrics"]["brain-diffuser"]


def test_build_public_hides_restrictive_gt(tmp_path):
    out = tmp_path / "artifact_public"
    build_artifact(
        cfg=_cfg(tmp_path),
        reconstructor=FakeReconstructor(size=64),
        method="brain-diffuser",
        items=_make_items(3),
        coco_index=COCO_INDEX,
        profile="public",
        out_dir=out,
    )
    manifest = json.loads((out / "manifest.json").read_text())
    validate_manifest(manifest)
    by_id = {it["id"]: it for it in manifest["items"]}
    # coco 100 (id 4) affichable
    assert by_id["0000"]["gt"]["displayable"] is True
    assert by_id["0000"]["gt"]["path"] is not None
    assert (out / by_id["0000"]["gt"]["path"]).exists()
    # coco 101 (id 2, NC) NON affichable : pas de fichier, path null
    assert by_id["0001"]["gt"]["displayable"] is False
    assert by_id["0001"]["gt"]["path"] is None
    # garantie légale : le fichier gt ne doit pas exister physiquement sur disque
    assert not (out / "gt" / "0001.jpg").exists()
    # reconstruction toujours présente même quand la GT est masquée
    assert (out / by_id["0001"]["recon"]["brain-diffuser"]).exists()


def test_build_is_resumable(tmp_path):
    out = tmp_path / "artifact_resume"
    args = dict(
        cfg=_cfg(tmp_path),
        method="brain-diffuser",
        items=_make_items(2),
        coco_index=COCO_INDEX,
        profile="local",
        out_dir=out,
    )
    build_artifact(reconstructor=FakeReconstructor(size=64), **args)
    recon_path = out / "recon" / "0000_brain-diffuser.png"
    mtime_before = recon_path.stat().st_mtime_ns
    # 2e run : ne doit pas réécrire les png déjà présents
    build_artifact(reconstructor=FakeReconstructor(size=64), **args)
    assert recon_path.stat().st_mtime_ns == mtime_before


def test_build_rejects_unknown_method_and_profile(tmp_path):
    with pytest.raises(ValueError):
        build_artifact(
            cfg=_cfg(tmp_path),
            reconstructor=FakeReconstructor(size=64),
            method="bogus",
            items=_make_items(1),
            coco_index=COCO_INDEX,
            profile="local",
            out_dir=tmp_path / "artifact_bad_method",
        )
    with pytest.raises(ValueError):
        build_artifact(
            cfg=_cfg(tmp_path),
            reconstructor=FakeReconstructor(size=64),
            method="brain-diffuser",
            items=_make_items(1),
            coco_index=COCO_INDEX,
            profile="bogus",
            out_dir=tmp_path / "artifact_bad_profile",
        )
