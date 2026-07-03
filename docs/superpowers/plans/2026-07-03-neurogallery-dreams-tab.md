# NeuroGallery — Onglet « Rêves » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un onglet `/dreams` (« Rêves ») à l'app NeuroGallery qui met en scène le décodage de rêve fMRI réel (Horikawa/Kamitani 2013) avec un contrat d'honnêteté strict réel/rendu, dont une séquence « réveil » animée et 1 rêve héro + 2 secondaires.

**Architecture:** Deux moitiés. (1) **Lab (offline)** : `examples.py` (données réelles curées, source de vérité) + `build.py` (fonctions pures) + `make_dreams.py` (CLI qui écrit `dreams.json` sans GPU, et génère les images oniriques par diffusion locale). (2) **App (web)** : nouvelle route isolée dans `app/src/features/dreams/`, données chargées depuis un contrat JSON dédié (`dreams.json`) validé au bord, aucune pollution du manifest NSD.

**Tech Stack:** App = React 18 + Vite + TypeScript, framer-motion, lucide-react, react-router-dom v6, Vitest + @testing-library/react, Playwright (chromium). Lab = Python, diffusers (StableDiffusionPipeline), PIL, numpy, jsonschema, pytest.

## Global Constraints

- **Contrat d'honnêteté (non négociable).** Réel et sourcé = activité + catégories décodées + faits d'étude (Horikawa et al., *Science*, 2013). Généré par nous = les images oniriques, **toujours** étiquetées « rendu illustratif ».
- **Interdit :** aucune citation de rapport de rêve attribuée à un sujet (les sources ouvertes n'en publient pas) → le `report_reconstructed` est reconstitué à partir des catégories réelles et libellé comme reconstitution.
- **Interdit :** aucune probabilité de confiance inventée par réveil. Les chiffres proviennent uniquement de `study_metrics` (mesures d'étude), jamais présentés comme sortie du décodeur pour un réveil précis.
- **Interdit :** ne jamais présenter une image comme « le vrai rêve » ou « l'image vue ».
- Les libellés d'honnêteté sont **testés dans le DOM** pour empêcher toute régression silencieuse.
- **Isolation données :** contrat `dreams.json` dédié ; ne PAS toucher `manifest.json`, `manifest.schema.json`, ni `app/src/lib/manifest.ts`.
- **Assets committables :** les images oniriques sont notre contenu (mots de catégories → diffusion), aucun contenu NSD/COCO → committables (contrairement aux données NSD gitignorées).
- **Accessibilité/perf :** `prefers-reduced-motion` respecté (animations → états statiques) ; animations uniquement sur `transform`/`opacity`/`filter` ; images avec dimensions explicites et `alt`.
- **Style :** réutiliser les tokens existants (`app/src/styles/tokens.css`) ; styles de l'onglet dans un fichier dédié `app/src/features/dreams/dreams.css` importé dans `main.tsx` (garde `global.css` sous contrôle).
- **Portée nav :** lien « Rêves » placé après « Explication » dans la nav.
- Coverage ≥ 80 % sur la logique nouvelle (validation, machine à états, build.py).

---

## File Structure

**Créés — contrat de données :**
- `dreams.schema.json` (racine) — schéma JSON draft-07 du contrat `dreams.json`.

**Créés — lab :**
- `lab/neurogallery/dreams/__init__.py`
- `lab/neurogallery/dreams/examples.py` — données réelles curées (source de vérité).
- `lab/neurogallery/dreams/build.py` — fonctions pures : `build_prompt`, `to_dreams_manifest`, `write_manifest`, `dream_postprocess`.
- `lab/scripts/make_dreams.py` — CLI : écrit `dreams.json` (sans GPU) + génère images (GPU).
- `lab/tests/unit/test_dreams_build.py` — tests pytest des fonctions pures.
- `lab/tests/unit/test_make_dreams_smoke.py` — smoke GPU (`@pytest.mark.gpu`) de la génération d'images.

**Créés — app :**
- `app/src/lib/dreams.ts` — types + `validateDreams` + `loadDreams`.
- `app/src/lib/dreams.test.ts`
- `app/src/hooks/useDreams.ts` — hook de chargement.
- `app/src/features/dreams/awakening.ts` — machine à états pure.
- `app/src/features/dreams/awakening.test.ts`
- `app/src/features/dreams/EegTrace.tsx` — tracé EEG SVG.
- `app/src/features/dreams/DreamPlate.tsx` — carte d'un rêve (rendu onirique + honnêteté).
- `app/src/features/dreams/DreamPlate.test.tsx`
- `app/src/features/dreams/Awakening.tsx` — séquence « réveil ».
- `app/src/features/dreams/Awakening.test.tsx`
- `app/src/features/dreams/DreamsPage.tsx` — page + sections.
- `app/src/features/dreams/DreamsPage.test.tsx`
- `app/src/features/dreams/dreams.css`

**Créés — assets (produits par le lab) :**
- `app/public/dreams/dreams.json`
- `app/public/dreams/renders/*.webp`, `app/public/dreams/thumbs/*.jpg`

**Modifiés :**
- `app/src/App.tsx` — route `/dreams` + lien nav « Rêves ».
- `app/src/main.tsx` — `import "./features/dreams/dreams.css";`

---

## Task 1 : Contrat de données réel (schéma + données curées + build pur)

Produit le socle réel : le schéma JSON, les données réelles curées, et les fonctions pures qui transforment ces données en manifeste `dreams.json`. Aucun GPU.

**Recherche préalable (obligatoire, avant d'écrire les données) :** confirmer le **vocabulaire de catégories réellement décodé** par l'étude 2013 et les faits d'étude, à partir de sources publiques :
- `https://github.com/KamitaniLab/HumanDreamDecoding` (données/labels)
- `https://pmc.ncbi.nlm.nih.gov/articles/PMC5281549/` (réutilise le dataset ; catégories, fenêtre 9 s / 3 volumes, ~200 réveils/sujet)
- Horikawa et al. 2013, *Science* (`https://www.science.org/doi/10.1126/science.1234330`)

Règle d'honnêteté : ne retenir dans `examples.py` que des catégories **corroborées** par ces sources (type : `car`, `street`, `building/structure`, `person/man`, `girl/woman`, `room/dwelling`, `food`, `character/letter`, `book`, `furniture`). Les catégories sont présentées dans l'app comme « issues du vocabulaire de catégories décodé dans l'étude », **pas** comme la vérité-terrain d'un réveil précis. Toute catégorie non corroborée est retirée.

**Files:**
- Create: `dreams.schema.json`
- Create: `lab/neurogallery/dreams/__init__.py`
- Create: `lab/neurogallery/dreams/examples.py`
- Create: `lab/neurogallery/dreams/build.py`
- Test: `lab/tests/unit/test_dreams_build.py`

**Interfaces:**
- Produces:
  - `build_prompt(categories: list[str]) -> str`
  - `to_dreams_manifest() -> dict` (lit `examples.py`, renvoie un dict conforme à `dreams.schema.json` ; `render`/`thumb` dérivés de `id`)
  - `write_manifest(out_dir: Path) -> Path` (écrit `dreams.json` dans `out_dir`, sans GPU ; renvoie le chemin)
  - `dream_postprocess(img)` → image PIL (flou doux + grain ; même taille/mode)
  - `examples.STUDY: dict`, `examples.STUDY_METRICS: dict`, `examples.SOURCES: list[dict]`, `examples.EXAMPLES: list[dict]` (chaque exemple : `{id, featured, categories, report_reconstructed, seed}`)
  - `dreams.schema.json` (contrat partagé app+lab)

- [ ] **Step 1: Écrire le schéma JSON du contrat**

Create `dreams.schema.json` :

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "NeuroGallery Dreams",
  "type": "object",
  "required": ["study", "examples", "study_metrics", "sources"],
  "additionalProperties": false,
  "properties": {
    "study": {
      "type": "object",
      "required": ["title", "authors", "venue", "year", "subjects", "awakenings_per_subject", "window_seconds", "window_volumes", "source_url"],
      "additionalProperties": false,
      "properties": {
        "title": { "type": "string", "minLength": 1 },
        "authors": { "type": "string", "minLength": 1 },
        "venue": { "type": "string", "minLength": 1 },
        "year": { "type": "integer" },
        "subjects": { "type": "integer", "minimum": 1 },
        "awakenings_per_subject": { "type": "string", "minLength": 1 },
        "window_seconds": { "type": "number", "exclusiveMinimum": 0 },
        "window_volumes": { "type": "integer", "minimum": 1 },
        "source_url": { "type": "string", "minLength": 1 }
      }
    },
    "examples": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "featured", "categories", "report_reconstructed", "render", "thumb"],
        "additionalProperties": false,
        "properties": {
          "id": { "type": "string", "minLength": 1 },
          "featured": { "type": "boolean" },
          "categories": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 1 } },
          "report_reconstructed": { "type": "string", "minLength": 1 },
          "render": { "type": "string", "minLength": 1 },
          "thumb": { "type": "string", "minLength": 1 }
        }
      }
    },
    "study_metrics": {
      "type": "object",
      "required": ["pairwise_accuracy_pct", "note"],
      "additionalProperties": false,
      "properties": {
        "pairwise_accuracy_pct": { "type": "number", "minimum": 0, "maximum": 100 },
        "note": { "type": "string", "minLength": 1 }
      }
    },
    "sources": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["label", "url"],
        "additionalProperties": false,
        "properties": {
          "label": { "type": "string", "minLength": 1 },
          "url": { "type": "string", "minLength": 1 }
        }
      }
    }
  }
}
```

- [ ] **Step 2: Écrire les données réelles curées**

Create `lab/neurogallery/dreams/__init__.py` (vide).

Create `lab/neurogallery/dreams/examples.py` (remplacer les catégories par celles corroborées à l'étape de recherche ; garder exactement un `featured: True`) :

```python
"""Données réelles curées pour l'onglet « Rêves ».

Source de vérité unique. Faits et vocabulaire de catégories issus de
Horikawa et al., "Neural Decoding of Visual Imagery During Sleep",
Science, 2013. Les catégories reflètent le VOCABULAIRE décodé par l'étude,
pas la vérité-terrain d'un réveil précis. Les `report_reconstructed` sont
reconstitués à partir de ces catégories (jamais des citations de sujets).
"""
from __future__ import annotations

STUDY: dict = {
    "title": "Neural Decoding of Visual Imagery During Sleep",
    "authors": "Horikawa, Tamaki, Miyawaki, Kamitani",
    "venue": "Science",
    "year": 2013,
    "subjects": 3,
    "awakenings_per_subject": "~200",
    "window_seconds": 9.0,
    "window_volumes": 3,
    "source_url": "https://www.science.org/doi/10.1126/science.1234330",
}

STUDY_METRICS: dict = {
    "pairwise_accuracy_pct": 60,
    "note": (
        "Précision d'identification par paires mesurée dans l'étude "
        "(bien au-dessus du hasard, 50 %). Mesure d'étude — pas une "
        "sortie du décodeur pour un réveil précis."
    ),
}

SOURCES: list[dict] = [
    {"label": "Horikawa et al. 2013, Science",
     "url": "https://www.science.org/doi/10.1126/science.1234330"},
    {"label": "KamitaniLab/HumanDreamDecoding",
     "url": "https://github.com/KamitaniLab/HumanDreamDecoding"},
    {"label": "Making Your Dreams A Reality (2025)",
     "url": "https://arxiv.org/abs/2501.09350"},
]

# Chaque exemple : catégories issues du vocabulaire décodé, report reconstitué.
EXAMPLES: list[dict] = [
    {
        "id": "dream-01",
        "featured": True,
        "categories": ["personne", "rue", "bâtiment"],
        "report_reconstructed": "Une rue bordée de bâtiments ; une silhouette au loin.",
        "seed": 1013,
    },
    {
        "id": "dream-02",
        "featured": False,
        "categories": ["pièce", "meuble", "livre"],
        "report_reconstructed": "Une pièce calme ; des meubles, un livre posé.",
        "seed": 2027,
    },
    {
        "id": "dream-03",
        "featured": False,
        "categories": ["voiture", "rue"],
        "report_reconstructed": "Une voiture immobile dans une rue.",
        "seed": 3041,
    },
]
```

- [ ] **Step 3: Écrire le test qui échoue (build pur)**

Create `lab/tests/unit/test_dreams_build.py` (le fichier est dans `tests/unit/`, donc la racine du dépôt = `parents[3]`) :

```python
import json
from pathlib import Path

import jsonschema
from PIL import Image

from neurogallery.dreams.build import (
    build_prompt, to_dreams_manifest, write_manifest, dream_postprocess,
)

SCHEMA = json.loads((Path(__file__).resolve().parents[3] / "dreams.schema.json").read_text())


def test_build_prompt_includes_all_categories_and_dream_aesthetic():
    prompt = build_prompt(["personne", "rue", "bâtiment"])
    for cat in ["personne", "rue", "bâtiment"]:
        assert cat in prompt
    assert "dream" in prompt.lower() or "onirique" in prompt.lower()


def test_manifest_validates_against_schema():
    manifest = to_dreams_manifest()
    jsonschema.validate(manifest, SCHEMA)


def test_manifest_has_exactly_one_featured():
    manifest = to_dreams_manifest()
    featured = [e for e in manifest["examples"] if e["featured"]]
    assert len(featured) == 1


def test_render_and_thumb_paths_derived_from_id():
    manifest = to_dreams_manifest()
    for ex in manifest["examples"]:
        assert ex["render"] == f"renders/{ex['id']}.webp"
        assert ex["thumb"] == f"thumbs/{ex['id']}.jpg"
        assert "seed" not in ex  # `seed` interne au lab, ne doit pas fuiter


def test_write_manifest_writes_valid_json(tmp_path):
    out = write_manifest(tmp_path)
    assert out == tmp_path / "dreams.json"
    data = json.loads(out.read_text(encoding="utf-8"))
    jsonschema.validate(data, SCHEMA)


def test_dream_postprocess_preserves_size_and_mode():
    src = Image.new("RGB", (64, 48), (120, 90, 200))
    out = dream_postprocess(src)
    assert out.size == (64, 48)
    assert out.mode == "RGB"
```

- [ ] **Step 4: Lancer le test — doit échouer**

Run: `cd lab && python -m pytest tests/unit/test_dreams_build.py -v`
Expected: FAIL (`ModuleNotFoundError: neurogallery.dreams.build`).

- [ ] **Step 5: Implémenter les fonctions pures**

Create `lab/neurogallery/dreams/build.py` :

```python
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
```

- [ ] **Step 6: Lancer les tests — doivent passer**

Run: `cd lab && python -m pytest tests/unit/test_dreams_build.py -v`
Expected: PASS (6 tests). `jsonschema` et `pillow` sont déjà des dépendances lab.

- [ ] **Step 7: Commit**

```bash
git add dreams.schema.json lab/neurogallery/dreams/__init__.py lab/neurogallery/dreams/examples.py lab/neurogallery/dreams/build.py lab/tests/unit/test_dreams_build.py
git commit -m "feat(dreams): contrat de données réel (schéma + données curées + build pur)"
```

---

## Task 2 : Générateur `make_dreams.py` (JSON sans GPU + images par diffusion)

CLI mince au-dessus de `build.py` : (a) écrit toujours `dreams.json` (sans GPU) via `write_manifest`, et (b) génère les images oniriques par diffusion locale (GPU) sauf `--json-only`. On exécute `--json-only` maintenant pour committer un `dreams.json` réel ; les images viennent d'une run GPU (Task 7). Le smoke de génération est marqué `@pytest.mark.gpu` (exclu par défaut, comme les autres tests GPU du lab).

**Files:**
- Create: `lab/scripts/make_dreams.py`
- Test: `lab/tests/unit/test_make_dreams_smoke.py`
- Create (output, committé): `app/public/dreams/dreams.json`

**Interfaces:**
- Consumes: `neurogallery.dreams.build.write_manifest`, `build_prompt`, `dream_postprocess` ; `neurogallery.dreams.examples.EXAMPLES`
- Produces: script CLI `make_dreams.py` avec `render_images(out_dir: Path) -> None` (GPU) et `main()` ; fichier committé `app/public/dreams/dreams.json`.

- [ ] **Step 1: Écrire le smoke GPU qui échoue**

Create `lab/tests/unit/test_make_dreams_smoke.py` :

```python
import importlib.util
from pathlib import Path

import pytest

# Le script n'est pas un package : on le charge par chemin (pas d'import 'scripts.*').
_SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "make_dreams.py"


def _load_make_dreams():
    spec = importlib.util.spec_from_file_location("make_dreams", _SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_script_exposes_expected_api():
    md = _load_make_dreams()
    assert callable(md.render_images)
    assert callable(md.main)


@pytest.mark.gpu
def test_render_images_produces_assets(tmp_path):
    md = _load_make_dreams()
    md.render_images(tmp_path)
    ids = [e["id"] for e in md.examples.EXAMPLES]
    for i in ids:
        assert (tmp_path / "renders" / f"{i}.webp").exists()
        assert (tmp_path / "thumbs" / f"{i}.jpg").exists()
```

- [ ] **Step 2: Lancer le test — doit échouer**

Run: `cd lab && python -m pytest tests/unit/test_make_dreams_smoke.py -v`
Expected: FAIL (`FileNotFoundError` sur `scripts/make_dreams.py`). Le test `@pytest.mark.gpu` est désélectionné par défaut.

- [ ] **Step 3: Implémenter le script**

Create `lab/scripts/make_dreams.py` :

```python
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
```

- [ ] **Step 4: Lancer le smoke non-GPU — doit passer**

Run: `cd lab && python -m pytest tests/unit/test_make_dreams_smoke.py -v`
Expected: PASS (`test_script_exposes_expected_api` ; le smoke GPU reste désélectionné).

- [ ] **Step 5: Générer le vrai `dreams.json` (sans GPU) et vérifier**

Run: `cd lab && python scripts/make_dreams.py --json-only`
Expected: `dreams.json écrit → .../app/public/dreams/dreams.json`.

Run: `cd lab && python -c "import json,jsonschema,pathlib; s=json.loads(pathlib.Path('../dreams.schema.json').read_text()); d=json.loads(pathlib.Path('../app/public/dreams/dreams.json').read_text()); jsonschema.validate(d,s); print('OK', len(d['examples']),'rêves')"`
Expected: `OK 3 rêves`.

- [ ] **Step 6: Commit**

```bash
git add lab/scripts/make_dreams.py lab/tests/unit/test_make_dreams_smoke.py app/public/dreams/dreams.json
git commit -m "feat(dreams): générateur make_dreams (JSON sans GPU + images diffusion) + dreams.json réel"
```

---

## Task 3 : Couche données app (`dreams.ts`)

Types + validation fail-fast + chargement, en miroir de `manifest.ts` (mêmes idiomes : `assert`, `Error` en français, `fetch`).

**Files:**
- Create: `app/src/lib/dreams.ts`
- Test: `app/src/lib/dreams.test.ts`

**Interfaces:**
- Produces:
  - types `DreamStudy`, `DreamExample`, `DreamMetrics`, `DreamSource`, `Dreams`
  - `validateDreams(data: unknown): Dreams`
  - `loadDreams(baseUrl: string): Promise<Dreams>`
  - `DREAMS_BASE: string`

- [ ] **Step 1: Écrire le test qui échoue**

Create `app/src/lib/dreams.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { validateDreams, type Dreams } from "./dreams";

const valid: Dreams = {
  study: {
    title: "Neural Decoding of Visual Imagery During Sleep",
    authors: "Horikawa, Tamaki, Miyawaki, Kamitani",
    venue: "Science", year: 2013, subjects: 3,
    awakenings_per_subject: "~200", window_seconds: 9, window_volumes: 3,
    source_url: "https://example.org",
  },
  examples: [
    { id: "dream-01", featured: true, categories: ["personne", "rue"],
      report_reconstructed: "Une rue.", render: "renders/dream-01.webp", thumb: "thumbs/dream-01.jpg" },
  ],
  study_metrics: { pairwise_accuracy_pct: 60, note: "mesure d'étude" },
  sources: [{ label: "Horikawa 2013", url: "https://example.org" }],
};

describe("validateDreams", () => {
  it("accepte un contrat valide", () => {
    expect(validateDreams(valid)).toEqual(valid);
  });

  it("rejette une racine non-objet", () => {
    expect(() => validateDreams(null)).toThrow(/Dreams invalide/);
  });

  it("rejette des examples vides", () => {
    expect(() => validateDreams({ ...valid, examples: [] })).toThrow(/examples/);
  });

  it("rejette des categories vides sur un exemple", () => {
    const bad = { ...valid, examples: [{ ...valid.examples[0], categories: [] }] };
    expect(() => validateDreams(bad)).toThrow(/categories/);
  });

  it("rejette un report_reconstructed manquant", () => {
    const ex = { ...valid.examples[0] } as Record<string, unknown>;
    delete ex.report_reconstructed;
    expect(() => validateDreams({ ...valid, examples: [ex] })).toThrow(/report_reconstructed/);
  });
});
```

- [ ] **Step 2: Lancer le test — doit échouer**

Run: `cd app && npx vitest run src/lib/dreams.test.ts`
Expected: FAIL (module `./dreams` introuvable).

- [ ] **Step 3: Implémenter la couche données**

Create `app/src/lib/dreams.ts` :

```ts
import { assetUrl } from "./artifact";

export interface DreamStudy {
  title: string;
  authors: string;
  venue: string;
  year: number;
  subjects: number;
  awakenings_per_subject: string;
  window_seconds: number;
  window_volumes: number;
  source_url: string;
}

export interface DreamExample {
  id: string;
  featured: boolean;
  categories: string[];
  report_reconstructed: string;
  render: string;
  thumb: string;
}

export interface DreamMetrics {
  pairwise_accuracy_pct: number;
  note: string;
}

export interface DreamSource {
  label: string;
  url: string;
}

export interface Dreams {
  study: DreamStudy;
  examples: DreamExample[];
  study_metrics: DreamMetrics;
  sources: DreamSource[];
}

export const DREAMS_BASE = `${import.meta.env.BASE_URL}dreams`;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Dreams invalide : ${msg}`);
}

export function validateDreams(data: unknown): Dreams {
  assert(isObject(data), "racine n'est pas un objet");

  const s = data.study;
  assert(isObject(s), "champ 'study' manquant/invalide");
  assert(typeof s.title === "string", "study.title");
  assert(typeof s.authors === "string", "study.authors");
  assert(typeof s.venue === "string", "study.venue");
  assert(typeof s.year === "number", "study.year");
  assert(typeof s.subjects === "number", "study.subjects");
  assert(typeof s.awakenings_per_subject === "string", "study.awakenings_per_subject");
  assert(typeof s.window_seconds === "number", "study.window_seconds");
  assert(typeof s.window_volumes === "number", "study.window_volumes");
  assert(typeof s.source_url === "string", "study.source_url");

  assert(Array.isArray(data.examples) && data.examples.length > 0, "examples doit être un tableau non vide");
  for (const [i, raw] of data.examples.entries()) {
    assert(isObject(raw), `example ${i} n'est pas un objet`);
    assert(typeof raw.id === "string", `example ${i}.id`);
    assert(typeof raw.featured === "boolean", `example ${i}.featured`);
    assert(Array.isArray(raw.categories) && raw.categories.length > 0, `example ${i}.categories doit être non vide`);
    for (const c of raw.categories) assert(typeof c === "string", `example ${i}.categories`);
    assert(typeof raw.report_reconstructed === "string" && raw.report_reconstructed.length > 0, `example ${i}.report_reconstructed`);
    assert(typeof raw.render === "string", `example ${i}.render`);
    assert(typeof raw.thumb === "string", `example ${i}.thumb`);
  }

  const m = data.study_metrics;
  assert(isObject(m), "champ 'study_metrics' manquant/invalide");
  assert(typeof m.pairwise_accuracy_pct === "number", "study_metrics.pairwise_accuracy_pct");
  assert(typeof m.note === "string", "study_metrics.note");

  assert(Array.isArray(data.sources) && data.sources.length > 0, "sources doit être un tableau non vide");
  for (const [i, raw] of data.sources.entries()) {
    assert(isObject(raw), `source ${i} n'est pas un objet`);
    assert(typeof raw.label === "string", `source ${i}.label`);
    assert(typeof raw.url === "string", `source ${i}.url`);
  }

  return data as unknown as Dreams;
}

export async function loadDreams(baseUrl: string): Promise<Dreams> {
  const res = await fetch(`${baseUrl}/dreams.json`);
  if (!res.ok) throw new Error(`Échec du chargement des rêves (${res.status})`);
  return validateDreams(await res.json());
}

/** URL d'un asset de rêve (render/thumb) relatif à la base des rêves. */
export function dreamAsset(relPath: string): string {
  return assetUrl(DREAMS_BASE, relPath);
}
```

- [ ] **Step 4: Lancer le test — doit passer**

Run: `cd app && npx vitest run src/lib/dreams.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/dreams.ts app/src/lib/dreams.test.ts
git commit -m "feat(dreams): couche données app (types + validation fail-fast + loadDreams)"
```

---

## Task 4 : Machine à états « réveil » (pure) + `EegTrace`

Logique de séquence pure et testable, plus le tracé EEG SVG (purement présentation).

**Files:**
- Create: `app/src/features/dreams/awakening.ts`
- Test: `app/src/features/dreams/awakening.test.ts`
- Create: `app/src/features/dreams/EegTrace.tsx`

**Interfaces:**
- Produces:
  - `type AwakeningPhase = "sleeping" | "onset" | "awake" | "decoding" | "forming" | "truth"`
  - `AWAKENING_PHASES: readonly AwakeningPhase[]`
  - `nextPhase(p: AwakeningPhase): AwakeningPhase` (reste à `"truth"` en fin)
  - `phaseIndex(p: AwakeningPhase): number`
  - `atLeast(current: AwakeningPhase, target: AwakeningPhase): boolean` (current a-t-il atteint target)
  - composant `EegTrace(props: { active: boolean })`

- [ ] **Step 1: Écrire le test qui échoue**

Create `app/src/features/dreams/awakening.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { AWAKENING_PHASES, nextPhase, phaseIndex, atLeast } from "./awakening";

describe("awakening state machine", () => {
  it("progresse dans l'ordre attendu", () => {
    expect(AWAKENING_PHASES).toEqual(["sleeping", "onset", "awake", "decoding", "forming", "truth"]);
  });

  it("nextPhase avance d'un cran", () => {
    expect(nextPhase("sleeping")).toBe("onset");
    expect(nextPhase("decoding")).toBe("forming");
  });

  it("nextPhase reste à truth en fin de séquence", () => {
    expect(nextPhase("truth")).toBe("truth");
  });

  it("atLeast compare la progression", () => {
    expect(atLeast("forming", "decoding")).toBe(true);
    expect(atLeast("onset", "decoding")).toBe(false);
    expect(atLeast("truth", "truth")).toBe(true);
  });

  it("phaseIndex donne la position", () => {
    expect(phaseIndex("sleeping")).toBe(0);
    expect(phaseIndex("truth")).toBe(5);
  });
});
```

- [ ] **Step 2: Lancer le test — doit échouer**

Run: `cd app && npx vitest run src/features/dreams/awakening.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter la machine à états**

Create `app/src/features/dreams/awakening.ts` :

```ts
export type AwakeningPhase =
  | "sleeping"
  | "onset"
  | "awake"
  | "decoding"
  | "forming"
  | "truth";

export const AWAKENING_PHASES: readonly AwakeningPhase[] = [
  "sleeping", "onset", "awake", "decoding", "forming", "truth",
] as const;

export function phaseIndex(p: AwakeningPhase): number {
  return AWAKENING_PHASES.indexOf(p);
}

export function nextPhase(p: AwakeningPhase): AwakeningPhase {
  const i = phaseIndex(p);
  return AWAKENING_PHASES[Math.min(i + 1, AWAKENING_PHASES.length - 1)];
}

/** current a-t-il atteint (ou dépassé) target ? */
export function atLeast(current: AwakeningPhase, target: AwakeningPhase): boolean {
  return phaseIndex(current) >= phaseIndex(target);
}
```

- [ ] **Step 4: Lancer le test — doit passer**

Run: `cd app && npx vitest run src/features/dreams/awakening.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Implémenter `EegTrace` (SVG)**

Create `app/src/features/dreams/EegTrace.tsx` :

```tsx
/** Tracé EEG stylisé. Animation CSS (translation) quand `active`, sinon statique. */
export function EegTrace({ active }: { active: boolean }) {
  // Deux périodes identiques pour un défilement sans couture.
  const wave =
    "M0 20 L10 20 L14 8 L18 32 L22 20 L34 20 L38 14 L42 26 L46 20 L60 20" +
    " L70 20 L74 8 L78 32 L82 20 L94 20 L98 14 L102 26 L106 20 L120 20";
  return (
    <svg
      className={`eeg${active ? " eeg-active" : ""}`}
      viewBox="0 0 60 40"
      preserveAspectRatio="none"
      role="img"
      aria-label="Tracé EEG"
    >
      <path d={wave} className="eeg-path" />
    </svg>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add app/src/features/dreams/awakening.ts app/src/features/dreams/awakening.test.ts app/src/features/dreams/EegTrace.tsx
git commit -m "feat(dreams): machine à états 'réveil' (pure) + tracé EEG"
```

---

## Task 5 : `DreamPlate` (carte de rêve, honnêteté + fallback)

Composant présentationnel affichant un rêve : rendu onirique (avec repli gracieux si l'image manque), catégories réelles, rapport reconstitué, libellé « rendu illustratif ».

**Files:**
- Create: `app/src/features/dreams/DreamPlate.tsx`
- Test: `app/src/features/dreams/DreamPlate.test.tsx`

**Interfaces:**
- Consumes: `DreamExample` (de `../../lib/dreams`), `dreamAsset`
- Produces: `DreamPlate(props: { dream: DreamExample })`

- [ ] **Step 1: Écrire le test qui échoue**

Create `app/src/features/dreams/DreamPlate.test.tsx` :

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DreamPlate } from "./DreamPlate";
import type { DreamExample } from "../../lib/dreams";

const dream: DreamExample = {
  id: "dream-01",
  featured: true,
  categories: ["personne", "rue", "bâtiment"],
  report_reconstructed: "Une rue bordée de bâtiments.",
  render: "renders/dream-01.webp",
  thumb: "thumbs/dream-01.jpg",
};

describe("DreamPlate", () => {
  it("affiche les catégories réelles", () => {
    render(<DreamPlate dream={dream} />);
    for (const c of dream.categories) {
      expect(screen.getByText(c)).toBeInTheDocument();
    }
  });

  it("affiche le rapport reconstitué avec son libellé", () => {
    render(<DreamPlate dream={dream} />);
    expect(screen.getByText(dream.report_reconstructed)).toBeInTheDocument();
    expect(screen.getByText(/Reconstitué à partir des catégories/i)).toBeInTheDocument();
  });

  it("étiquette l'image comme rendu illustratif (honnêteté)", () => {
    render(<DreamPlate dream={dream} />);
    expect(screen.getByText(/rendu illustratif/i)).toBeInTheDocument();
    // l'alt de l'image porte aussi la mention
    expect(screen.getByAltText(/rendu illustratif/i)).toBeInTheDocument();
  });

  it("ne présente jamais l'image comme 'vue' ou 'vraie image'", () => {
    render(<DreamPlate dream={dream} />);
    expect(screen.queryByText(/image vue/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/vrai rêve/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Lancer le test — doit échouer**

Run: `cd app && npx vitest run src/features/dreams/DreamPlate.test.tsx`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter `DreamPlate`**

Create `app/src/features/dreams/DreamPlate.tsx` :

```tsx
import { useState } from "react";
import { dreamAsset, type DreamExample } from "../../lib/dreams";

/** Carte d'un rêve : rendu onirique (repli si absent) + catégories réelles + honnêteté. */
export function DreamPlate({ dream }: { dream: DreamExample }) {
  const [failed, setFailed] = useState(false);
  const alt = `Rêve « ${dream.categories.join(", ")} » — rendu illustratif`;

  return (
    <figure className="dream-plate">
      <div className="dream-render-frame">
        {failed ? (
          <div className="dream-fallback" aria-label={alt}>
            <span>{dream.categories.join(" · ")}</span>
          </div>
        ) : (
          <img
            className="dream-render"
            src={dreamAsset(dream.render)}
            alt={alt}
            width={512}
            height={512}
            loading="lazy"
            onError={() => setFailed(true)}
          />
        )}
        <span className="dream-badge ui-label">rendu illustratif</span>
      </div>

      <figcaption className="dream-body">
        <div className="dream-cats">
          {dream.categories.map((c) => (
            <span key={c} className="cat-chip">{c}</span>
          ))}
        </div>
        <p className="dream-report">{dream.report_reconstructed}</p>
        <p className="dream-report-note faint ui-label">
          Reconstitué à partir des catégories décodées
        </p>
      </figcaption>
    </figure>
  );
}
```

- [ ] **Step 4: Lancer le test — doit passer**

Run: `cd app && npx vitest run src/features/dreams/DreamPlate.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/features/dreams/DreamPlate.tsx app/src/features/dreams/DreamPlate.test.tsx
git commit -m "feat(dreams): carte DreamPlate (catégories réelles + honnêteté + repli image)"
```

---

## Task 6 : Séquence `Awakening` (pièce maîtresse)

Compose la machine à états, `EegTrace` et `DreamPlate` en une séquence cinématique. Auto-avance via timers ; sous `prefers-reduced-motion` tout est visible d'emblée (état `truth`).

**Files:**
- Create: `app/src/features/dreams/Awakening.tsx`
- Test: `app/src/features/dreams/Awakening.test.tsx`

**Interfaces:**
- Consumes: `DreamExample`, `DreamMetrics` (de `../../lib/dreams`), `AwakeningPhase`, `AWAKENING_PHASES`, `nextPhase`, `atLeast` (de `./awakening`), `EegTrace`, `DreamPlate`
- Produces: `Awakening(props: { dream: DreamExample; metrics: DreamMetrics })`

- [ ] **Step 1: Écrire le test qui échoue**

Create `app/src/features/dreams/Awakening.test.tsx` :

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Awakening } from "./Awakening";
import type { DreamExample, DreamMetrics } from "../../lib/dreams";

const dream: DreamExample = {
  id: "dream-01", featured: true, categories: ["personne", "rue"],
  report_reconstructed: "Une rue.", render: "renders/dream-01.webp", thumb: "thumbs/dream-01.jpg",
};
const metrics: DreamMetrics = { pairwise_accuracy_pct: 60, note: "mesure d'étude" };

// test-setup.ts stub matchMedia → matches:false (pas de reduced-motion) par défaut.
// On force reduced-motion pour un rendu déterministe et complet.
function forceReducedMotion() {
  (globalThis as unknown as { matchMedia: (q: string) => MediaQueryList }).matchMedia = (q: string) =>
    ({ matches: true, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; } } as unknown as MediaQueryList);
}

describe("Awakening", () => {
  it("sous reduced-motion, montre les catégories, le rendu illustratif et la carte de vérité", () => {
    forceReducedMotion();
    render(<Awakening dream={dream} metrics={metrics} />);
    expect(screen.getByText("personne")).toBeInTheDocument();
    expect(screen.getByText("rue")).toBeInTheDocument();
    expect(screen.getAllByText(/rendu illustratif/i).length).toBeGreaterThan(0);
    // carte de vérité : distinction réel vs rendu
    expect(screen.getByText(/activité \+ catégories/i)).toBeInTheDocument();
    expect(screen.getByText(/Horikawa/i)).toBeInTheDocument();
  });

  it("affiche la mesure d'étude sans la présenter comme sortie par réveil", () => {
    forceReducedMotion();
    render(<Awakening dream={dream} metrics={metrics} />);
    expect(screen.getByText(/60\s*%/)).toBeInTheDocument();
    expect(screen.getByText(/mesure d'étude/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Lancer le test — doit échouer**

Run: `cd app && npx vitest run src/features/dreams/Awakening.test.tsx`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter `Awakening`**

Create `app/src/features/dreams/Awakening.tsx` :

```tsx
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Moon, Zap } from "lucide-react";
import type { DreamExample, DreamMetrics } from "../../lib/dreams";
import { AWAKENING_PHASES, atLeast, nextPhase, type AwakeningPhase } from "./awakening";
import { EegTrace } from "./EegTrace";
import { DreamPlate } from "./DreamPlate";

const STEP_MS = 1400;

/** Séquence « réveil » : sleeping → onset → awake → decoding → forming → truth. */
export function Awakening({ dream, metrics }: { dream: DreamExample; metrics: DreamMetrics }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<AwakeningPhase>(reduce ? "truth" : "sleeping");

  useEffect(() => {
    if (reduce) { setPhase("truth"); return; }
    if (phase === "truth") return;
    const t = setTimeout(() => setPhase((p) => nextPhase(p)), STEP_MS);
    return () => clearTimeout(t);
  }, [phase, reduce]);

  const showCats = atLeast(phase, "decoding");
  const showRender = atLeast(phase, "forming");
  const showTruth = atLeast(phase, "truth");
  const asleep = !atLeast(phase, "awake");

  return (
    <div className={`awakening awakening-${phase}`}>
      {/* Bandeau EEG / sommeil */}
      <div className="awk-eeg">
        <span className="awk-eeg-icon">{asleep ? <Moon size={16} /> : <Zap size={16} />}</span>
        <EegTrace active={!reduce && asleep} />
        <span className="ui-label faint">
          {asleep ? "sommeil · sleep-onset" : "réveil"}
        </span>
      </div>

      {/* Décodage : catégories réelles */}
      <div className={`awk-decoding${showCats ? " on" : ""}`}>
        <span className="ui-label" style={{ color: "var(--cyan)" }}>Catégories décodées</span>
        <div className="dream-cats" style={{ marginTop: "0.6rem" }}>
          {dream.categories.map((c, i) => (
            <span key={c} className="cat-chip" style={{ transitionDelay: `${i * 90}ms` }}>{c}</span>
          ))}
        </div>
        <p className="faint ui-label" style={{ marginTop: "0.6rem" }}>
          {metrics.pairwise_accuracy_pct}% — {metrics.note}
        </p>
      </div>

      {/* Formation du rêve */}
      <div className={`awk-forming${showRender ? " on" : ""}`}>
        <DreamPlate dream={dream} />
      </div>

      {/* Carte de vérité */}
      <div className={`awk-truth${showTruth ? " on" : ""}`}>
        <p>
          <strong style={{ color: "var(--cyan)" }}>Réel :</strong> activité + catégories
          {" "}(Horikawa 2013). <strong style={{ color: "var(--magenta)" }}>Rendu :</strong> l'image
          est notre reconstruction illustrative, pas une image vue.
        </p>
      </div>

      {/* Progression (repère visuel) */}
      <div className="awk-steps" aria-hidden="true">
        {AWAKENING_PHASES.map((p) => (
          <span key={p} className={`awk-dot${atLeast(phase, p) ? " on" : ""}`} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Lancer le test — doit passer**

Run: `cd app && npx vitest run src/features/dreams/Awakening.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/src/features/dreams/Awakening.tsx app/src/features/dreams/Awakening.test.tsx
git commit -m "feat(dreams): séquence 'réveil' (machine à états + EEG + rendu + vérité)"
```

---

## Task 7 : `DreamsPage`, styles, routage & vérification finale

Assemble la page (sections narratives + pièce maîtresse + rêves secondaires + honnêteté + sources), branche la route/nav, ajoute les styles, puis génère les images (GPU) et vérifie visuellement.

**Files:**
- Create: `app/src/hooks/useDreams.ts`
- Create: `app/src/features/dreams/DreamsPage.tsx`
- Test: `app/src/features/dreams/DreamsPage.test.tsx`
- Create: `app/src/features/dreams/dreams.css`
- Modify: `app/src/App.tsx`
- Modify: `app/src/main.tsx`

**Interfaces:**
- Consumes: `loadDreams`, `DREAMS_BASE`, `Dreams` ; `Awakening`, `DreamPlate` ; `Reveal` (de `../../components/Reveal`)
- Produces: `useDreams()` → `{ dreams, loading, error }` ; `DreamsPage` (default export) ; route `/dreams`

- [ ] **Step 1: Implémenter le hook de chargement**

Create `app/src/hooks/useDreams.ts` :

```ts
import { useEffect, useState } from "react";
import { loadDreams, DREAMS_BASE, type Dreams } from "../lib/dreams";

export function useDreams() {
  const [dreams, setDreams] = useState<Dreams | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    loadDreams(DREAMS_BASE)
      .then((d) => { if (alive) setDreams(d); })
      .catch((e) => { if (alive) setError(String(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return { dreams, error, loading };
}
```

- [ ] **Step 2: Écrire le test de page qui échoue**

Create `app/src/features/dreams/DreamsPage.test.tsx` :

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DreamsPage from "./DreamsPage";
import type { Dreams } from "../../lib/dreams";

const dreams: Dreams = {
  study: {
    title: "Neural Decoding of Visual Imagery During Sleep",
    authors: "Horikawa, Tamaki, Miyawaki, Kamitani",
    venue: "Science", year: 2013, subjects: 3, awakenings_per_subject: "~200",
    window_seconds: 9, window_volumes: 3, source_url: "https://example.org",
  },
  examples: [
    { id: "dream-01", featured: true, categories: ["personne", "rue"], report_reconstructed: "Une rue.", render: "renders/dream-01.webp", thumb: "thumbs/dream-01.jpg" },
    { id: "dream-02", featured: false, categories: ["pièce", "livre"], report_reconstructed: "Une pièce.", render: "renders/dream-02.webp", thumb: "thumbs/dream-02.jpg" },
    { id: "dream-03", featured: false, categories: ["voiture"], report_reconstructed: "Une voiture.", render: "renders/dream-03.webp", thumb: "thumbs/dream-03.jpg" },
  ],
  study_metrics: { pairwise_accuracy_pct: 60, note: "mesure d'étude" },
  sources: [{ label: "Horikawa 2013", url: "https://example.org" }],
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => dreams }) as unknown as Response));
});

describe("DreamsPage", () => {
  it("charge et rend les sections clés", async () => {
    render(<MemoryRouter><DreamsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument());
    // faits réels d'étude
    expect(screen.getByText(/9\s*s/)).toBeInTheDocument();
    expect(screen.getAllByText(/Horikawa/i).length).toBeGreaterThan(0);
  });

  it("contient le bloc d'honnêteté 'ce que ça fait / ne fait pas'", async () => {
    render(<MemoryRouter><DreamsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/Ce que ça fait/i)).toBeInTheDocument());
    expect(screen.getByText(/Ce que ça ne fait pas/i)).toBeInTheDocument();
    expect(screen.getByText(/pas une image vue/i)).toBeInTheDocument();
  });

  it("liste les sources cliquables", async () => {
    render(<MemoryRouter><DreamsPage /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("link", { name: /Horikawa 2013/i })).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Lancer le test — doit échouer**

Run: `cd app && npx vitest run src/features/dreams/DreamsPage.test.tsx`
Expected: FAIL (module introuvable).

- [ ] **Step 4: Implémenter `DreamsPage`**

Create `app/src/features/dreams/DreamsPage.tsx` :

```tsx
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Moon, Brain, Check, X, ArrowRight, BookOpen } from "lucide-react";
import { useDreams } from "../../hooks/useDreams";
import { Reveal } from "../../components/Reveal";
import { Awakening } from "./Awakening";
import { DreamPlate } from "./DreamPlate";

function Shell({ children }: { children: ReactNode }) {
  return <div className="wrap section">{children}</div>;
}

export default function DreamsPage() {
  const { dreams, loading, error } = useDreams();
  const reduce = useReducedMotion();

  if (loading) return <Shell><h1 style={{ fontSize: "var(--text-title)" }}>Rêves</h1><p className="dim">Chargement…</p></Shell>;
  if (error || !dreams) return <Shell><h1 style={{ fontSize: "var(--text-title)" }}>Impossible de charger les rêves.</h1></Shell>;

  const hero = dreams.examples.find((e) => e.featured) ?? dreams.examples[0];
  const others = dreams.examples.filter((e) => e.id !== hero.id);
  const s = dreams.study;

  return (
    <div className="dream-night">
      {/* HERO */}
      <section className="wrap" style={{ paddingTop: "clamp(3rem,7vw,6rem)", paddingBottom: "clamp(1rem,3vw,2rem)" }}>
        <motion.p className="eyebrow" initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Moon size={14} /> À la frontière du sommeil
        </motion.p>
        <motion.h1 className="hero-title" style={{ fontSize: "var(--text-display)", margin: "1.1rem 0 1.2rem" }}
          initial={reduce ? false : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.08 }}>
          Et pendant<br /><span className="grad-text">qu'on dort ?</span>
        </motion.h1>
        <motion.p className="explain-lead" initial={reduce ? false : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.16 }}>
          Le même cortex visuel s'active en rêvant qu'en regardant. En 2013, l'équipe de
          Kamitani a décodé le <em>contenu de rêves</em> depuis l'IRMf. Voici comment — et
          jusqu'où c'est vrai.
        </motion.p>
      </section>

      {/* PROTOCOLE RÉEL */}
      <section className="wrap section" style={{ paddingTop: "2rem" }}>
        <Reveal><h2 style={{ fontSize: "var(--text-title)", marginBottom: "1.5rem" }}>Le protocole, réel</h2></Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "1rem" }}>
          {[
            { n: "01", t: "Dormir en IRMf", d: `${s.subjects} sujets endormis dans le scanner, EEG simultané.` },
            { n: "02", t: "Détecter l'endormissement", d: "L'EEG repère la signature du sleep-onset (NREM)." },
            { n: "03", t: "Réveiller & demander", d: `« Qu'as-tu vu ? » — ${s.awakenings_per_subject} réveils par sujet.` },
            { n: "04", t: "Décoder 9 s d'activité", d: `Les ${s.window_volumes} volumes (${s.window_seconds}s) avant le réveil sont décodés.` },
          ].map((c, i) => (
            <Reveal key={c.n} delay={i * 0.07}>
              <div className="panel-card" style={{ padding: "1.5rem", height: "100%" }}>
                <span className="grad-text" style={{ fontSize: "var(--text-lg)", fontWeight: 700 }}>{c.n}</span>
                <h3 style={{ fontSize: "var(--text-base)", marginTop: "0.5rem" }}>{c.t}</h3>
                <p className="dim" style={{ marginTop: "0.4rem", fontSize: "var(--text-sm)" }}>{c.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* PIÈCE MAÎTRESSE */}
      <section className="wrap section" style={{ paddingTop: "1rem" }}>
        <Reveal><h2 style={{ fontSize: "var(--text-display)", textAlign: "center", marginBottom: "0.6rem" }}>Un <span className="grad-text">réveil</span></h2></Reveal>
        <Reveal delay={0.05}><p className="dim" style={{ textAlign: "center", maxWidth: "48ch", margin: "0 auto 2.5rem" }}>Du sommeil à l'image : ce que le cerveau encodait, décodé puis rendu.</p></Reveal>
        <Reveal delay={0.1}><Awakening dream={hero} metrics={dreams.study_metrics} /></Reveal>
      </section>

      {/* RÊVES SECONDAIRES */}
      {others.length > 0 && (
        <section className="wrap section" style={{ paddingTop: 0 }}>
          <Reveal><h2 style={{ fontSize: "var(--text-title)", marginBottom: "1.5rem" }}>D'autres rêves</h2></Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "1.25rem" }}>
            {others.map((d, i) => (
              <Reveal key={d.id} delay={i * 0.08}><DreamPlate dream={d} /></Reveal>
            ))}
          </div>
        </section>
      )}

      {/* PONT AVEC LE PIPELINE */}
      <section className="wrap section" style={{ paddingTop: 0 }}>
        <Reveal>
          <div className="panel-card" style={{ padding: "1.75rem", display: "flex", gap: "1.25rem", alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: "var(--grad-soft)", border: "1px solid var(--line)", color: "var(--cyan)", flex: "0 0 auto" }}><Brain size={22} /></div>
            <div style={{ flex: "1 1 320px" }}>
              <h3 style={{ fontSize: "var(--text-lg)" }}>Le même problème que cette galerie</h3>
              <p className="dim" style={{ marginTop: "0.5rem" }}>
                Décoder un rêve, c'est la chaîne <em>activité → empreinte → image</em>, exactement
                comme NeuroGallery — mais entraînée sur la perception éveillée et appliquée au sommeil.{" "}
                <Link to="/explain" className="inline-link">Voir la méthode en clair</Link>.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* CE QUE ÇA FAIT / NE FAIT PAS */}
      <section className="wrap section" style={{ paddingTop: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1.5rem" }}>
          <Reveal>
            <div className="panel-card" style={{ padding: "1.75rem", height: "100%" }}>
              <h3 style={{ fontSize: "var(--text-lg)", color: "var(--good)" }}>Ce que ça fait</h3>
              <ul className="checklist" style={{ marginTop: "1rem" }}>
                {["Retrouve des catégories réellement rêvées, mieux que le hasard.",
                  "S'appuie sur le même cortex visuel qu'en perception éveillée.",
                  "Repose sur des données publiées et ouvertes (Kamitani Lab)."].map((t) => (
                  <li key={t}><Check className="ic" size={17} color="var(--good)" /><span className="dim">{t}</span></li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="panel-card" style={{ padding: "1.75rem", height: "100%" }}>
              <h3 style={{ fontSize: "var(--text-lg)", color: "var(--bad)" }}>Ce que ça ne fait pas</h3>
              <ul className="checklist" style={{ marginTop: "1rem" }}>
                {["L'image montrée est un rendu illustratif, pas une image vue du rêve.",
                  "Pas de vérité-pixel : un rêve n'a pas d'image de référence.",
                  "Le décodage robuste est au niveau catégorie, pas photo nette."].map((t) => (
                  <li key={t}><X className="ic" size={17} color="var(--bad)" /><span className="dim">{t}</span></li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 2013 → 2025 + SOURCES */}
      <section className="wrap section" style={{ paddingTop: 0 }}>
        <Reveal>
          <div className="cta-band">
            <h2 style={{ fontSize: "var(--text-title)" }}>2013 → aujourd'hui</h2>
            <p className="dim" style={{ maxWidth: "52ch", margin: "0.75rem auto 1.5rem" }}>
              De la catégorie (2013) à la « vidéo de rêve » reconstruite (2025). Le champ avance
              vite — et reste honnête sur le flou du résultat.
            </p>
            <div style={{ display: "flex", gap: "0.8rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/explain" className="btn btn-primary"><BookOpen size={17} /> La méthode</Link>
              <Link to="/gallery" className="btn btn-ghost">La galerie <ArrowRight size={17} /></Link>
            </div>
            <div className="dream-sources">
              {dreams.sources.map((src) => (
                <a key={src.url} href={src.url} target="_blank" rel="noopener noreferrer" className="inline-link">{src.label}</a>
              ))}
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Ajouter les styles**

Create `app/src/features/dreams/dreams.css` :

```css
/* Onglet Rêves — déclinaison nocturne des tokens existants. */
.dream-night { position: relative; }

/* Tracé EEG */
.eeg { width: 100%; height: 34px; display: block; }
.eeg-path { fill: none; stroke: var(--cyan); stroke-width: 1.1; opacity: 0.85; }
.eeg-active .eeg-path { animation: eegScroll 1.6s linear infinite; }
@keyframes eegScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }

/* Séquence réveil */
.awakening {
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: linear-gradient(180deg, oklch(16% 0.03 285 / 0.6), oklch(12% 0.02 285 / 0.6));
  padding: clamp(1.25rem, 4vw, 2.5rem);
  display: grid; gap: 1.5rem;
}
.awk-eeg { display: flex; align-items: center; gap: 0.75rem; }
.awk-eeg-icon { color: var(--cyan); display: grid; place-items: center; }

.awk-decoding, .awk-forming, .awk-truth {
  opacity: 0; transform: translateY(10px);
  transition: opacity var(--dur) var(--ease), transform var(--dur) var(--ease);
}
.awk-decoding.on, .awk-forming.on, .awk-truth.on { opacity: 1; transform: none; }

.awk-truth p {
  border: 1px solid var(--line-strong); border-radius: var(--radius);
  padding: 1rem 1.25rem; background: var(--grad-soft); font-size: var(--text-sm);
}

.awk-steps { display: flex; gap: 0.4rem; justify-content: center; }
.awk-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--line-strong); transition: background var(--dur) var(--ease); }
.awk-dot.on { background: var(--cyan); }

/* Catégories */
.dream-cats { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.cat-chip {
  padding: 0.3rem 0.7rem; border-radius: 999px; white-space: nowrap;
  border: 1px solid var(--line-strong); background: var(--grad-soft);
  font-size: var(--text-sm); color: var(--ink);
}

/* Carte de rêve */
.dream-plate { margin: 0; }
.dream-render-frame {
  position: relative; aspect-ratio: 1; border-radius: var(--radius);
  overflow: hidden; border: 1px solid var(--line);
}
.dream-render, .dream-fallback { width: 100%; height: 100%; object-fit: cover; display: block; }
/* Aspect onirique renforcé côté CSS (impression, pas photo). */
.dream-render { filter: saturate(0.85) brightness(1.02) blur(0.4px); }
.dream-fallback {
  display: grid; place-items: center; text-align: center; padding: 1rem;
  background: linear-gradient(135deg, var(--violet), var(--magenta), var(--cyan));
  color: white; font-size: var(--text-sm); letter-spacing: 0.02em;
}
.dream-badge {
  position: absolute; left: 0.6rem; bottom: 0.6rem;
  padding: 0.25rem 0.55rem; border-radius: 999px;
  background: oklch(10% 0.02 285 / 0.72); color: var(--ink);
  backdrop-filter: blur(6px); border: 1px solid var(--line);
}
.dream-body { margin-top: 0.9rem; display: grid; gap: 0.5rem; }
.dream-report { font-size: var(--text-sm); color: var(--ink); }
/* couleur atténuée fournie par la classe .faint (voir typography.css) */

.dream-sources { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; margin-top: 1.5rem; }
.inline-link { color: var(--cyan); text-decoration: underline; text-underline-offset: 3px; }
.inline-link:hover { color: var(--magenta); }

@media (prefers-reduced-motion: reduce) {
  .eeg-active .eeg-path { animation: none; }
  .awk-decoding, .awk-forming, .awk-truth { opacity: 1; transform: none; transition: none; }
  .dream-render { filter: saturate(0.9); }
}
```

Note : `--radius-lg`, `--dur`, `--ease`, `--grad-soft`, `--line-strong`, `--good`, `--bad` sont déjà définis dans `tokens.css`/`global.css` (utilisés par les pages existantes). Vérifier leur présence ; sinon réutiliser les équivalents présents.

- [ ] **Step 6: Importer les styles**

Modify `app/src/main.tsx` — ajouter après la ligne `import "./styles/global.css";` :

```tsx
import "./features/dreams/dreams.css";
```

- [ ] **Step 7: Brancher route & nav**

Modify `app/src/App.tsx` :

Ajouter l'import (avec les autres imports de pages) :

```tsx
import DreamsPage from "./features/dreams/DreamsPage";
```

Ajouter le lien nav juste après le lien « Explication » :

```tsx
<NavLink to="/dreams">Rêves</NavLink>
```

Ajouter la route juste après la route `/explain` :

```tsx
<Route path="/dreams" element={<DreamsPage />} />
```

- [ ] **Step 8: Lancer le test de page — doit passer**

Run: `cd app && npx vitest run src/features/dreams/DreamsPage.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 9: Suite complète + types + build**

Run: `cd app && npx vitest run`
Expected: tous les tests passent (existants + nouveaux).

Run: `cd app && npx tsc -b --noEmit` (ou `npm run build`)
Expected: 0 erreur TypeScript.

- [ ] **Step 10: Générer les images oniriques (GPU — manuel)**

⚠️ **Impact production / à faire par l'utilisateur sur la RTX 5070.** Étape lourde (télécharge le modèle de diffusion, génère 3 images). À valider d'abord isolément ; aucune donnée sensible n'est traitée, mais la première exécution télécharge des poids depuis Hugging Face.

Run: `cd lab && python scripts/make_dreams.py`
Expected: `dreams.json écrit …` puis `rendu dream-01 …`, `rendu dream-02 …`, `rendu dream-03 …`, `images générées.`
Vérifier : `ls app/public/dreams/renders app/public/dreams/thumbs` → 3 `.webp` + 3 `.jpg`.

- [ ] **Step 11: Vérification visuelle (Playwright, chromium)**

Depuis `app/`, dev server lancé (`npm run dev`), naviguer sur `/dreams`, captures aux largeurs 375 / 768 / 1440. Vérifier : hero, séquence « réveil » (catégories → rendu → carte de vérité), rêves secondaires, bloc honnêteté, badges « rendu illustratif » visibles, lien nav « Rêves » actif. Vérifier `prefers-reduced-motion` (tout visible, sans animation).

- [ ] **Step 12: Commit**

```bash
git add app/src/hooks/useDreams.ts app/src/features/dreams/DreamsPage.tsx app/src/features/dreams/DreamsPage.test.tsx app/src/features/dreams/dreams.css app/src/main.tsx app/src/App.tsx app/public/dreams/renders app/public/dreams/thumbs app/public/dreams/dreams.json
git commit -m "feat(dreams): page /dreams (récit + réveil), styles nocturnes, route/nav + images"
```

---

## Self-Review (rempli par l'auteur du plan)

**1. Couverture spec :**
- §2 contrat d'honnêteté → Global Constraints + tests DOM (Tasks 5, 6, 7) ✅
- §3 architecture / isolation données → Task 3 (contrat isolé), aucune touche au manifest ✅
- §4 contrat `dreams.json` → Task 1 (schéma) + Task 3 (validation TS) ✅
- §5 structure page (7 sections) → Task 7 `DreamsPage` ✅
- §6 pièce maîtresse machine à états → Tasks 4 + 6 ✅
- §7 direction visuelle/motion + reduced-motion → Task 7 `dreams.css` + branches reduce ✅
- §8 étape lab `make_dreams.py` → Task 2 ✅
- §9 tests (unit + e2e + honnêteté) → chaque task TDD + Task 7 steps 9/11 ✅
- §10 hors scope (4A, vidéo) → non implémenté, mentionné en narratif ✅

**2. Placeholders :** aucun « TODO/TBD » ; chaque step de code porte le code réel. Les catégories exactes sont sourcées à l'étape de recherche de Task 1 (action concrète, pas un placeholder).

**3. Cohérence des types :** `Dreams`/`DreamExample`/`DreamMetrics` définis en Task 3 et consommés à l'identique en Tasks 5/6/7 ; `AwakeningPhase`/`nextPhase`/`atLeast` définis en Task 4 et consommés en Task 6 ; `to_dreams_manifest`/`build_prompt` définis en Task 1 et consommés en Task 2. `render`/`thumb` = `renders/<id>.webp` / `thumbs/<id>.jpg` cohérents entre `build.py` (Task 1) et `make_dreams.py` (Task 2).
