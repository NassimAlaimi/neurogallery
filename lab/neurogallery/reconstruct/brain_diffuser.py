"""Wrapper single-GPU de Brain-Diffuser (ozcelikfu/brain-diffuser, MIT).

Plancher de qualité, 100% local. Ridge pré-ajusté (fit_from_subject) -> VDVAE
(ébauche) -> Versatile Diffusion (sémantique). fp16 + attention/vae slicing pour
tenir sur 12 Go. Voir spec §3.2 et Risques §8 (bump PyTorch cu128, repli SDPA).
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

from neurogallery.config import LabConfig


class BrainDiffuserReconstructor:
    def __init__(self, cfg: LabConfig, weights_dir: Path, device: str = "cuda") -> None:
        import torch
        from diffusers import VersatileDiffusionDualGuidedPipeline

        self._cfg = cfg
        self._device = device
        dtype = getattr(torch, cfg.dtype)

        # Régressions ridge pré-ajustées (betas -> latents), sauvegardées par fit_from_subject.
        self._ridge = np.load(weights_dir / "ridge_weights.npz")

        pipe = VersatileDiffusionDualGuidedPipeline.from_pretrained(
            "shi-labs/versatile-diffusion", torch_dtype=dtype
        )
        if cfg.enable_attention_slicing:
            pipe.enable_attention_slicing()
        if cfg.enable_vae_tiling:
            pipe.enable_vae_tiling()
        if cfg.enable_cpu_offload:
            pipe.enable_model_cpu_offload()
        else:
            pipe = pipe.to(device)
        self._pipe = pipe

    def _predict_latents(self, betas: np.ndarray) -> dict[str, np.ndarray]:
        # betas [n_voxels] -> embeddings CLIP image/texte via régressions ridge.
        x = betas.astype(np.float32).reshape(1, -1)
        return {
            "clip_image": x @ self._ridge["W_clip_image"] + self._ridge["b_clip_image"],
            "clip_text": x @ self._ridge["W_clip_text"] + self._ridge["b_clip_text"],
        }

    def reconstruct(self, betas: np.ndarray) -> Image.Image:
        latents = self._predict_latents(betas)
        # Guidage dual (image+texte) de Versatile Diffusion à partir des latents prédits.
        out = self._pipe(
            image_embeddings=latents["clip_image"],
            text_embeddings=latents["clip_text"],
            num_inference_steps=self._cfg.diffusion_steps,
        )
        return out.images[0]
