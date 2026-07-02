"""Smoke test du vrai reconstructeur — nécessite GPU + poids. Lancer : pytest -m gpu"""
import numpy as np
import pytest
from PIL import Image

pytestmark = pytest.mark.gpu


def test_brain_diffuser_reconstructs_an_image():
    import torch

    from neurogallery.config import default_config, with_overrides
    from neurogallery.reconstruct.brain_diffuser import BrainDiffuserReconstructor

    if not torch.cuda.is_available():
        pytest.skip("pas de GPU")

    cfg = default_config()
    weights_dir = cfg.data_dir / "brain-diffuser-weights"
    if not weights_dir.exists():
        pytest.skip("poids Brain-Diffuser absents (voir scripts/acquire_data.py)")

    rec = BrainDiffuserReconstructor(with_overrides(cfg, diffusion_steps=5), weights_dir)
    n_voxels = cfg.expected_voxels
    img = rec.reconstruct(np.zeros(n_voxels, dtype=np.float32))
    assert isinstance(img, Image.Image)
    assert img.size[0] > 0 and img.size[1] > 0
