"""Fonctions pures : prompt, assemblage du manifeste rêves, écriture JSON, post-traitement onirique."""
from __future__ import annotations

import json
from pathlib import Path

from neurogallery.dreams import examples

_DREAM_STYLE = (
    "dreamlike, hazy, soft focus, ethereal glow, oneiric atmosphere, "
    "film grain, muted colors, blurred edges"
)


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
        json.dumps(to_dreams_manifest(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return path


def dream_postprocess(img):
    """Renforce l'aspect onirique : flou doux + grain léger. Préserve taille/mode."""
    from PIL import Image, ImageFilter
    import numpy as np

    img = img.convert("RGB").filter(ImageFilter.GaussianBlur(radius=1.4))
    arr = np.asarray(img, dtype=np.float32)
    rng = np.random.default_rng(0)
    grain = rng.normal(0.0, 8.0, arr.shape)
    arr = np.clip(arr + grain, 0, 255).astype("uint8")
    return Image.fromarray(arr)
