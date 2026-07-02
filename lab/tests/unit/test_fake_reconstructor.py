import numpy as np
from PIL import Image

from neurogallery.reconstruct.fake import FakeReconstructor


def test_fake_returns_pil_image_of_expected_size():
    rec = FakeReconstructor(size=64)
    img = rec.reconstruct(np.zeros(100, dtype=np.float32))
    assert isinstance(img, Image.Image)
    assert img.size == (64, 64)


def test_fake_is_deterministic_for_same_betas():
    rec = FakeReconstructor(size=32)
    betas = np.arange(50, dtype=np.float32)
    a = np.asarray(rec.reconstruct(betas))
    b = np.asarray(rec.reconstruct(betas))
    assert np.array_equal(a, b)


def test_fake_differs_for_different_betas():
    rec = FakeReconstructor(size=32)
    a = np.asarray(rec.reconstruct(np.zeros(50, dtype=np.float32)))
    b = np.asarray(rec.reconstruct(np.ones(50, dtype=np.float32)))
    assert not np.array_equal(a, b)
