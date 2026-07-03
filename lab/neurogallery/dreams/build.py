"""Fonctions pures : prompt, assemblage du manifeste rêves, écriture JSON, post-traitement onirique."""
from __future__ import annotations

import json
from pathlib import Path

from neurogallery.dreams import examples

_DREAM_STYLE = (
    "dreamlike, hazy, soft focus, ethereal glow, oneiric atmosphere, "
    "film grain, muted colors, blurred edges"
)

# Intensité du post-traitement onirique appliqué par dream_postprocess().
_DREAM_BLUR_RADIUS = 1.4
_DREAM_GRAIN_STD = 8.0


def build_prompt(categories: list[str]) -> str:
    """Prompt text->image à partir des catégories réelles + esthétique onirique."""
    subject = ", ".join(categories)
    return f"{subject} — {_DREAM_STYLE}"


def to_dreams_manifest() -> dict:
    """Assemble un dict conforme à dreams.schema.json depuis examples.py.

    `render`/`thumb` sont dérivés de l'id ; le champ interne `seed` est retiré.
    """
    out_examples = []
    for ex in examples.EXAMPLES:
        out_examples.append({
            "id": ex["id"],
            "featured": bool(ex["featured"]),
            "categories": list(ex["categories"]),
            "report_reconstructed": ex["report_reconstructed"],
            "render": f"renders/{ex['id']}.webp",
            "thumb": f"thumbs/{ex['id']}.jpg",
        })
    return {
        "study": dict(examples.STUDY),
        "examples": out_examples,
        "study_metrics": dict(examples.STUDY_METRICS),
        "sources": [dict(s) for s in examples.SOURCES],
    }


def write_manifest(out_dir: Path) -> Path:
    """Écrit dreams.json dans out_dir (sans GPU) et renvoie son chemin."""
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / "dreams.json"
    path.write_text(
        json.dumps(to_dreams_manifest(), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return path


def dream_postprocess(img):
    """Renforce l'aspect onirique : flou doux + grain léger. Préserve taille/mode."""
    # Importés localement (pas en tête de module) pour que build.py reste
    # importable sans la stack imaging — utile pour `--json-only` et le
    # smoke test de chargement du module.
    from PIL import Image, ImageFilter
    import numpy as np

    orig_mode = img.mode
    rgb = img.convert("RGB").filter(ImageFilter.GaussianBlur(radius=_DREAM_BLUR_RADIUS))
    arr = np.asarray(rgb, dtype=np.float32)
    rng = np.random.default_rng(0)
    grain = rng.normal(0.0, _DREAM_GRAIN_STD, arr.shape)
    arr = np.clip(arr + grain, 0, 255).astype("uint8")
    out = Image.fromarray(arr)
    return out.convert(orig_mode) if orig_mode != "RGB" else out


def example_from_decode(
    id: str, featured: bool, subject: str,
    reported: list[str], decoded: list[str], report_reconstructed: str,
) -> dict:
    """Build a real (decoded) dream example dict for the manifest.

    `render`/`thumb` derived from id. Holds `reported` (dataset ground truth)
    and `decoded` (our reproduction) instead of curated `categories`.
    """
    return {
        "id": id,
        "featured": bool(featured),
        "subject": subject,
        "reported": list(reported),
        "decoded": list(decoded),
        "report_reconstructed": report_reconstructed,
        "render": f"renders/{id}.webp",
        "thumb": f"thumbs/{id}.jpg",
    }
