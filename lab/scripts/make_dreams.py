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
# Modèle text->image public et non-restreint (les repos stabilityai/SD-2.1* sont
# désormais « gated » -> 401 en anonyme). SD 1.5 (~4 Go fp16) tient sur 12 Go.
BASE_MODEL = "stable-diffusion-v1-5/stable-diffusion-v1-5"


def render_images(out_dir: Path, model: str = BASE_MODEL) -> None:
    """Génère renders/<id>.webp + thumbs/<id>.jpg par diffusion (GPU requis)."""
    import torch
    from diffusers import StableDiffusionPipeline

    renders = out_dir / "renders"
    thumbs = out_dir / "thumbs"
    renders.mkdir(parents=True, exist_ok=True)
    thumbs.mkdir(parents=True, exist_ok=True)

    dtype = torch.float16 if torch.cuda.is_available() else torch.float32
    # token=False force un téléchargement anonyme : un éventuel token HF périmé
    # dans l'environnement ne peut pas provoquer un 401 sur un modèle public.
    pipe = StableDiffusionPipeline.from_pretrained(
        model, torch_dtype=dtype, safety_checker=None,
        requires_safety_checker=False, token=False,
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


def render_from_manifest(manifest: dict, out_dir: Path, model: str = BASE_MODEL) -> None:
    """Génère renders/<id>.webp + thumbs/<id>.jpg pour un manifeste décodé réel
    (`decode_dreams.py --render`). Même corps/paramètres que `render_images`,
    mais le prompt vient de `example["decoded"]` (top-k réel) et la seed est
    déterministe par position (pas de hash) pour rester reproductible."""
    import torch
    from diffusers import StableDiffusionPipeline

    renders = out_dir / "renders"
    thumbs = out_dir / "thumbs"
    renders.mkdir(parents=True, exist_ok=True)
    thumbs.mkdir(parents=True, exist_ok=True)

    dtype = torch.float16 if torch.cuda.is_available() else torch.float32
    pipe = StableDiffusionPipeline.from_pretrained(
        model, torch_dtype=dtype, safety_checker=None,
        requires_safety_checker=False, token=False,
    )
    pipe = pipe.to("cuda" if torch.cuda.is_available() else "cpu")
    pipe.vae.enable_tiling()

    for index, ex in enumerate(manifest["examples"]):
        prompt = build_prompt(ex["decoded"])
        seed = 1000 + index
        gen = torch.Generator(device=pipe.device).manual_seed(seed)
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
    parser.add_argument("--model", default=BASE_MODEL,
                        help="modèle text->image HF (public/non-gated) ; défaut : %(default)s")
    args = parser.parse_args()

    path = write_manifest(args.out)
    print(f"dreams.json écrit → {path}")
    if not args.json_only:
        render_images(args.out, model=args.model)
        print("images générées.")


if __name__ == "__main__":
    main()
