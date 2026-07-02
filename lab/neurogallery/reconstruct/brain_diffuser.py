"""Reconstructeur : betas -> embedding CLIP image (ridge) -> image (SD Image Variations).

Brain-Diffuser d'origine utilise Versatile Diffusion, mais VD est **déprécié** et ne
se charge plus sous diffusers récent (son `model_index.json` référence un composant
`text_unet` que le loader moderne ne résout plus ; VD exige de plus la séquence CLIP
complète [257,768], pas notre vecteur *pooled*). On utilise donc
`StableDiffusionImageVariationPipeline` (lambdalabs/sd-image-variations-diffusers),
qui conditionne sur exactement notre représentation : embedding CLIP ViT-L/14
**pooled [768]**. Non gaté, ~4-5 Go en fp16 (tient sur 12 Go).

Le ridge *texte* n'est pas utilisé par ce pipeline (guidage image seul) — on garde
les poids texte dans ridge_weights.npz pour un usage futur. 100% local, GPU requis.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

from neurogallery.config import LabConfig

IMAGE_VARIATION_MODEL = "lambdalabs/sd-image-variations-diffusers"
GUIDANCE_SCALE = 3.0  # recommandé par la carte du modèle sd-image-variations


class BrainDiffuserReconstructor:
    def __init__(self, cfg: LabConfig, weights_dir: Path, device: str = "cuda") -> None:
        import types

        import torch
        from diffusers import StableDiffusionImageVariationPipeline

        self._cfg = cfg
        self._device = device
        self._torch = torch
        dtype = getattr(torch, cfg.dtype)

        # Régressions ridge pré-ajustées (betas -> embeddings CLIP), cf. fit_ridge.py.
        self._ridge = np.load(weights_dir / "ridge_weights.npz")

        pipe = StableDiffusionImageVariationPipeline.from_pretrained(
            IMAGE_VARIATION_MODEL, torch_dtype=dtype
        )

        # Le pipeline encode normalement une image PIL en embedding CLIP ; on injecte
        # notre embedding *pré-calculé* [B,768] en remplaçant `_encode_image`.
        def _encode_from_embeds(self, image, device, num_images_per_prompt,
                                do_classifier_free_guidance):
            enc_dtype = next(self.image_encoder.parameters()).dtype
            emb = image.to(device=device, dtype=enc_dtype).unsqueeze(1)  # [B,1,768]
            bs, seq, dim = emb.shape
            emb = emb.repeat(1, num_images_per_prompt, 1).view(bs * num_images_per_prompt, seq, dim)
            if do_classifier_free_guidance:
                emb = torch.cat([torch.zeros_like(emb), emb])  # embedding "null" pour le CFG
            return emb

        pipe._encode_image = types.MethodType(_encode_from_embeds, pipe)

        if cfg.enable_attention_slicing:
            pipe.enable_attention_slicing()
        if cfg.enable_vae_tiling:
            pipe.enable_vae_tiling()
        if cfg.enable_cpu_offload:
            pipe.enable_model_cpu_offload()
        else:
            pipe = pipe.to(device)
        self._pipe = pipe

    def _predict_image_embedding(self, betas: np.ndarray):
        """betas [n_voxels] -> embedding CLIP image prédit, tenseur [1, 768]."""
        x = betas.astype(np.float32).reshape(1, -1)
        emb = x @ self._ridge["W_clip_image"] + self._ridge["b_clip_image"]
        return self._torch.from_numpy(np.ascontiguousarray(emb, dtype=np.float32))

    def reconstruct(self, betas: np.ndarray) -> Image.Image:
        emb = self._predict_image_embedding(betas)
        out = self._pipe(
            image=emb,
            guidance_scale=GUIDANCE_SCALE,
            num_inference_steps=self._cfg.diffusion_steps,
        )
        return out.images[0]
