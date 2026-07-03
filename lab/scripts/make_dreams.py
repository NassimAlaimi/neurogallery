"""Génère l'artefact « Rêves » : dreams.json (sans GPU) + images oniriques (GPU).

Les catégories et faits d'étude sont réels (Horikawa 2013) ; les images sont
NOTRE rendu illustratif par diffusion locale à partir des catégories.

Usage :
  python scripts/make_dreams.py --json-only         # écrit seulement dreams.json
  python scripts/make_dreams.py                      # écrit dreams.json + images (GPU)
"""
from __future__ import annotations

import argparse
from pathlib import Path

from neurogallery.dreams import examples
from neurogallery.dreams.build import build_prompt, dream_postprocess, write_manifest

# Destination : dossier public de l'app (assets committables, aucun contenu NSD).
DEFAULT_OUT = Path(__file__).resolve().parents[2] / "app" / "public" / "dreams"

RENDER_SIZE = 512
THUMB_SIZE = 256
NEGATIVE_PROMPT = "sharp, high detail, photorealistic, text, watermark, frame"
BASE_MODEL = "stabilityai/stable-diffusion-2-1-base"


def render_images(out_dir: Path) -> None:
    """Génère renders/<id>.webp + thumbs/<id>.jpg par diffusion (GPU requis)."""
    import torch
    from diffusers import StableDiffusionPipeline

    renders = out_dir / "renders"
    thumbs = out_dir / "thumbs"
    renders.mkdir(parents=True, exist_ok=True)
    thumbs.mkdir(parents=True, exist_ok=True)

    dtype = torch.float16 if torch.cuda.is_available() else torch.float32
    pipe = StableDiffusionPipeline.from_pretrained(
        BASE_MODEL, torch_dtype=dtype, safety_checker=None, requires_safety_checker=False
    )
    pipe = pipe.to("cuda" if torch.cuda.is_available() else "cpu")
    pipe.vae.enable_tiling()

    for ex in examples.EXAMPLES:
        prompt = build_prompt(ex["categories"])
        gen = torch.Generator(device=pipe.device).manual_seed(int(ex["seed"]))
        image = pipe(
            prompt, negative_prompt=NEGATIVE_PROMPT,
            width=RENDER_SIZE, height=RENDER_SIZE,
            guidance_scale=7.5, num_inference_steps=30, generator=gen,
        ).images[0]
        image = dream_postprocess(image)
        image.save(renders / f"{ex['id']}.webp", "WEBP", quality=88)
        image.resize((THUMB_SIZE, THUMB_SIZE)).convert("RGB").save(
            thumbs / f"{ex['id']}.jpg", "JPEG", quality=85
        )
        print(f"  rendu {ex['id']} : {prompt}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--json-only", action="store_true",
                        help="écrit dreams.json sans générer les images (pas de GPU)")
    args = parser.parse_args()

    path = write_manifest(args.out)
    print(f"dreams.json écrit → {path}")
    if not args.json_only:
        render_images(args.out)
        print("images générées.")


if __name__ == "__main__":
    main()
