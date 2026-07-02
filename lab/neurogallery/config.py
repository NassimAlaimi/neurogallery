"""Configuration typée et immuable du lab. Aucune valeur en dur ailleurs."""
from __future__ import annotations

import dataclasses
import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class LabConfig:
    data_dir: Path
    artifact_root: Path
    subject: str = "subj01"
    test_set: str = "shared1000"
    expected_voxels: int = 15724
    diffusion_steps: int = 20
    dtype: str = "float16"
    enable_attention_slicing: bool = True
    enable_vae_tiling: bool = True
    enable_cpu_offload: bool = False
    thumb_size: int = 256


def default_config() -> LabConfig:
    data_dir = Path(os.environ.get("NEUROGALLERY_DATA_DIR",
                                   Path.home() / "neurogallery-data"))
    artifact_root = Path(os.environ.get("NEUROGALLERY_ARTIFACT_ROOT",
                                        Path.home() / "neurogallery-artifacts"))
    return LabConfig(data_dir=data_dir, artifact_root=artifact_root)


def with_overrides(cfg: LabConfig, **changes) -> LabConfig:
    """Renvoie une nouvelle copie de `cfg` avec les champs modifiés (immuable)."""
    return dataclasses.replace(cfg, **changes)
