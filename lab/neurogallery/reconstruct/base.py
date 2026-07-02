"""Interface unique de reconstruction. `build` ne dépend que de `reconstruct`."""
from __future__ import annotations

from typing import Protocol

import numpy as np
from PIL import Image


class Reconstructor(Protocol):
    def reconstruct(self, betas: np.ndarray) -> Image.Image:
        """betas d'un essai [n_voxels] -> image reconstruite (PIL)."""
        ...
