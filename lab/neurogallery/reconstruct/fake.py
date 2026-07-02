"""Reconstructeur factice, déterministe, sans GPU — pour tester l'orchestration."""
from __future__ import annotations

import hashlib

import numpy as np
from PIL import Image


class FakeReconstructor:
    def __init__(self, size: int = 64) -> None:
        self._size = size

    def reconstruct(self, betas: np.ndarray) -> Image.Image:
        digest = hashlib.sha256(np.ascontiguousarray(betas, dtype=np.float32).tobytes())
        r, g, b = digest.digest()[:3]
        return Image.new("RGB", (self._size, self._size), (r, g, b))
