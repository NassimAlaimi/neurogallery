"""Smoke test du vrai embedder CLIP — nécessite GPU + open_clip. Lancer : pytest -m gpu"""
import numpy as np
import pytest
from PIL import Image

pytestmark = pytest.mark.gpu


def test_open_clip_embedder_embeds_image_and_text():
    import torch

    try:
        import open_clip  # noqa: F401
    except ImportError:
        pytest.skip("open_clip absent (voir extra [gpu])")

    if not torch.cuda.is_available():
        pytest.skip("pas de GPU")

    from neurogallery.reconstruct.clip_embedder import OpenClipEmbedder

    embedder = OpenClipEmbedder()
    image = Image.new("RGB", (224, 224), (128, 64, 32))

    img_emb = embedder.embed_images([image])
    txt_emb = embedder.embed_texts(["un chat sur un canapé"])

    assert img_emb.ndim == 2 and img_emb.shape[0] == 1
    assert txt_emb.ndim == 2 and txt_emb.shape[0] == 1
