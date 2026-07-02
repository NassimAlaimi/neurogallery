"""Embedder CLIP réel (OpenCLIP ViT-L/14) — GPU requis, jamais importé au niveau module.

Aligné sur l'encodeur utilisé par Brain-Diffuser/Versatile Diffusion (cf.
`brain_diffuser.py` : `shi-labs/versatile-diffusion`). torch et open_clip sont
importés dans `__init__`, jamais en tête de fichier, pour que la suite non-GPU
puisse importer ce module sans ces dépendances lourdes installées.

Note (comme dans brain_diffuser.py) : la forme exacte des embeddings et la
variante OpenCLIP à charger doivent être confirmées contre l'API Versatile
Diffusion réellement installée sur la machine GPU (poids/pré-traitement
peuvent différer légèrement entre versions) — voir spec §3.2/§8. Ce qui
importe ici, côté fit_ridge/BrainDiffuserReconstructor, c'est l'interface
publique `ClipEmbedder` (embed_images/embed_texts -> np.ndarray [n, D]).
"""
from __future__ import annotations

import numpy as np

OPEN_CLIP_MODEL_NAME = "ViT-L-14"
OPEN_CLIP_PRETRAINED = "openai"


class OpenClipEmbedder:
    """Implémentation `ClipEmbedder` basée sur open_clip (ViT-L/14)."""

    def __init__(self, device: str = "cuda") -> None:
        import open_clip
        import torch

        self._torch = torch
        self._device = device

        model, _, preprocess = open_clip.create_model_and_transforms(
            OPEN_CLIP_MODEL_NAME, pretrained=OPEN_CLIP_PRETRAINED
        )
        model = model.to(device)
        model.eval()

        self._model = model
        self._preprocess = preprocess
        self._tokenizer = open_clip.get_tokenizer(OPEN_CLIP_MODEL_NAME)

    def embed_images(self, images: list) -> np.ndarray:
        torch = self._torch
        batch = torch.stack([self._preprocess(img) for img in images]).to(self._device)
        with torch.no_grad():
            features = self._model.encode_image(batch)
        return features.cpu().numpy()

    def embed_texts(self, texts: list[str]) -> np.ndarray:
        torch = self._torch
        tokens = self._tokenizer(texts).to(self._device)
        with torch.no_grad():
            features = self._model.encode_text(tokens)
        return features.cpu().numpy()
