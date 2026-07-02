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

# Les poids 'openai' ont été entraînés avec l'activation QuickGELU : utiliser la
# variante -quickgelu, sinon open_clip instancie une GELU standard (activation
# incohérente -> embeddings faux). Cf. warning "QuickGELU mismatch".
OPEN_CLIP_MODEL_NAME = "ViT-L-14-quickgelu"
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

    def embed_images(self, images: list, batch_size: int = 32) -> np.ndarray:
        # Traitement par mini-lots : stacker 9000 images d'un coup ferait un OOM sur 12 Go.
        torch = self._torch
        feats = []
        for i in range(0, len(images), batch_size):
            chunk = images[i : i + batch_size]
            batch = torch.stack([self._preprocess(img) for img in chunk]).to(self._device)
            with torch.no_grad():
                feats.append(self._model.encode_image(batch).cpu().numpy())
        return np.concatenate(feats, axis=0)

    def embed_texts(self, texts: list[str], batch_size: int = 256) -> np.ndarray:
        torch = self._torch
        feats = []
        for i in range(0, len(texts), batch_size):
            tokens = self._tokenizer(texts[i : i + batch_size]).to(self._device)
            with torch.no_grad():
                feats.append(self._model.encode_text(tokens).cpu().numpy())
        return np.concatenate(feats, axis=0)
