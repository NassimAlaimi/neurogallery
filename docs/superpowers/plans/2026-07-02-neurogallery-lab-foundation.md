# NeuroGallery — Plan 1 : Lab Foundation (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire le "lab" offline qui, à partir de l'activité IRMf de subj01 (NSD), produit un **artefact** (reconstructions + `manifest.json` + vignettes + métriques) validé contre un schéma, entièrement en local sur RTX 5070/WSL2.

**Architecture :** Modules Python isolés reliés par des interfaces claires — `config` (paramètres typés), `licensing` (pur), `metrics` (math pure + extracteurs de features derrière une interface), `data` (chargement + intégrité), `reconstruct` (protocole `Reconstructor` + `FakeReconstructor` + `BrainDiffuserReconstructor`), `build` (orchestration → artefact). Le `manifest.schema.json` est le contrat unique validé à l'écriture. Toute l'orchestration est testable **sans GPU** via `FakeReconstructor`.

**Tech Stack :** Python ≥ 3.11, PyTorch ≥ 2.7 (`cu128`), numpy, Pillow, scikit-image, jsonschema, h5py, huggingface_hub, pytest. Gestion de projet via `uv`.

## Global Constraints

_(Chaque tâche hérite implicitement de ces contraintes. Valeurs copiées de la spec.)_

- **Compute 100% local** : RTX 5070 (12 Go, Blackwell **sm_120**) / WSL2. **Pas de cloud, pas d'entraînement MindEye2 de zéro.**
- **Toolchain** : PyTorch ≥ 2.7, roues **`cu128`**, CUDA 12.8+. `torch.cuda.get_device_capability()` doit renvoyer `(12, 0)`.
- **WSL2** : pilote NVIDIA **côté Windows uniquement** (jamais de pilote Linux dans WSL) ; données sur le FS Linux (`~/`), **jamais `/mnt/c`**.
- **Licences (dur)** : **ne jamais commit/rehéberger** les données NSD ni l'ensemble complet des stimuli COCO. `data/` et `artifact/` sont gitignored. Ids COCO affichables = `{4, 5, 7, 8}` ; attribution requise = `{4, 5}`.
- **subj01 uniquement** ; set de test = **shared1000**.
- **Immuabilité** : toujours renvoyer de nouveaux objets, jamais de mutation en place.
- **Qualité** : fichiers < 800 lignes, fonctions < 50 lignes, pas de valeur en dur (tout passe par `config`), erreurs gérées explicitement, validation aux frontières.
- **Pré-requis bloquant avant toute publication** (hors périmètre de ce plan, mais à ne pas oublier) : lire les *Terms & Conditions* NSD.

---

### Task 1: Scaffold du projet + sanity-check de la chaîne d'outils (M0)

**Files:**
- Create: `lab/pyproject.toml`
- Create: `lab/neurogallery/__init__.py`
- Create: `lab/scripts/check_toolchain.py`
- Create: `lab/tests/__init__.py`
- Create: `lab/tests/unit/__init__.py`
- Create: `lab/tests/integration/__init__.py`
- Create: `lab/README.md`

**Interfaces:**
- Consumes: rien (première tâche).
- Produces: package importable `neurogallery` ; commande `pytest` fonctionnelle ; script `check_toolchain.py` exécutable manuellement.

- [ ] **Step 1: Créer `lab/pyproject.toml`**

```toml
[project]
name = "neurogallery-lab"
version = "0.1.0"
description = "Offline lab: fMRI->image reconstruction artifact builder for NeuroGallery"
requires-python = ">=3.11"
dependencies = [
    "numpy>=1.26",
    "pillow>=10.0",
    "scikit-image>=0.22",
    "jsonschema>=4.21",
    "h5py>=3.10",
    "huggingface_hub>=0.23",
]

[project.optional-dependencies]
gpu = [
    # Installé séparément avec l'index cu128 — voir README.
    "torch>=2.7",
    "torchvision>=0.22",
    "diffusers>=0.27",
    "transformers>=4.40",
    "open_clip_torch>=2.24",
]
dev = ["pytest>=8.0", "pytest-cov>=5.0"]

[tool.pytest.ini_options]
testpaths = ["tests"]
markers = [
    "gpu: tests nécessitant un GPU + poids de modèles (exclus par défaut)",
]
addopts = "-m 'not gpu'"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

- [ ] **Step 2: Créer les fichiers de package vides**

`lab/neurogallery/__init__.py` :
```python
"""NeuroGallery lab: offline fMRI->image reconstruction artifact builder."""
__version__ = "0.1.0"
```

Créer aussi les fichiers vides : `lab/tests/__init__.py`, `lab/tests/unit/__init__.py`, `lab/tests/integration/__init__.py` (contenu vide).

- [ ] **Step 3: Écrire le sanity-check de la chaîne d'outils**

`lab/scripts/check_toolchain.py` :
```python
"""Sanity-check M0 : vérifie que la stack GPU est correcte pour Blackwell sm_120.

Lancer manuellement dans WSL2 :  python lab/scripts/check_toolchain.py
Échoue avec un message clair si la roue PyTorch n'est pas compatible sm_120.
"""
from __future__ import annotations

import sys

EXPECTED_CAPABILITY = (12, 0)  # RTX 5070 = Blackwell sm_120


def main() -> int:
    try:
        import torch
    except ImportError:
        print("[ERREUR] PyTorch non installé. Installer les roues cu128 :")
        print("  pip install torch torchvision --index-url "
              "https://download.pytorch.org/whl/cu128")
        return 1

    print(f"torch {torch.__version__}")
    if not torch.cuda.is_available():
        print("[ERREUR] CUDA indisponible. Vérifier : pilote NVIDIA côté Windows "
              "uniquement, WSL2 à jour, roue cu128.")
        return 1

    cap = torch.cuda.get_device_capability()
    print(f"device : {torch.cuda.get_device_name(0)}  capability : {cap}")
    if cap != EXPECTED_CAPABILITY:
        print(f"[AVERTISSEMENT] capability {cap} != {EXPECTED_CAPABILITY} attendu "
              "pour la RTX 5070. Une roue de mauvaise arch peut échouer silencieusement.")

    bf16 = torch.cuda.is_bf16_supported()
    print(f"bf16 supporté : {bf16}  (attendu True ; FP8 non exposé sous WSL, non pertinent)")

    # Micro-inférence : produit d'un tenseur sur GPU pour confirmer que les kernels tournent.
    try:
        x = torch.randn(256, 256, device="cuda", dtype=torch.float16)
        y = (x @ x).sum().item()
        print(f"micro-calcul GPU OK (somme={y:.1f})")
    except Exception as exc:  # noqa: BLE001 - on veut le message brut
        print(f"[ERREUR] micro-calcul GPU a échoué : {exc}")
        print("→ symptôme classique d'une roue non-sm_120. Réinstaller en cu128.")
        return 1

    print("Chaîne d'outils OK.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Écrire le README du lab (setup WSL2/cu128)**

`lab/README.md` :
```markdown
# NeuroGallery — Lab (offline)

Produit l'artefact de reconstructions IRMf→image pour l'app.

## Setup (WSL2 + RTX 5070 / Blackwell sm_120)

1. Pilote NVIDIA installé **côté Windows uniquement** (aucun pilote Linux dans WSL).
2. `uv venv && source .venv/bin/activate`
3. `uv pip install -e ".[dev]"`
4. PyTorch (roues cu128) :
   `uv pip install torch torchvision --index-url https://download.pytorch.org/whl/cu128`
5. `uv pip install -e ".[gpu]"`
6. Vérifier : `python scripts/check_toolchain.py` (doit afficher capability (12, 0)).

## Données

- Données NSD/COCO **jamais commit** (cf. `.gitignore`), stockées sur le FS Linux (`~/`), jamais `/mnt/c`.
- Acquisition : `python scripts/acquire_data.py` (voir Task 9).

## Tests

- `pytest`                → tests déterministes (sans GPU)
- `pytest -m gpu`         → smoke tests des reconstructeurs réels (GPU + poids requis)
```

- [ ] **Step 5: Vérifier que le package s'installe et que pytest tourne à vide**

Run:
```bash
cd lab && uv venv && source .venv/bin/activate && uv pip install -e ".[dev]" && pytest
```
Expected: installation OK ; `pytest` collecte 0 test et sort en succès (`no tests ran`).

- [ ] **Step 6: Commit**

```bash
git add lab/pyproject.toml lab/neurogallery/__init__.py lab/scripts/check_toolchain.py \
        lab/tests/__init__.py lab/tests/unit/__init__.py lab/tests/integration/__init__.py \
        lab/README.md
git commit -m "chore: scaffold lab package + toolchain sanity-check (M0)"
```

---

### Task 2: Module `config` (paramètres typés, zéro valeur en dur)

**Files:**
- Create: `lab/neurogallery/config.py`
- Test: `lab/tests/unit/test_config.py`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `@dataclass(frozen=True) class LabConfig` avec champs : `data_dir: Path`, `artifact_root: Path`, `subject: str = "subj01"`, `test_set: str = "shared1000"`, `expected_voxels: int = 15724`, `diffusion_steps: int = 20`, `dtype: str = "float16"`, `enable_attention_slicing: bool = True`, `enable_vae_tiling: bool = True`, `enable_cpu_offload: bool = False`, `thumb_size: int = 256`.
  - `def default_config() -> LabConfig` : lit `NEUROGALLERY_DATA_DIR` / `NEUROGALLERY_ARTIFACT_ROOT` depuis l'environnement, avec repli sur `~/neurogallery-data` et `~/neurogallery-artifacts`.
  - `def with_overrides(cfg: LabConfig, **changes) -> LabConfig` : renvoie une **nouvelle** copie (immuable).

- [ ] **Step 1: Écrire le test qui échoue**

`lab/tests/unit/test_config.py` :
```python
from pathlib import Path

from neurogallery.config import LabConfig, default_config, with_overrides


def test_default_config_reads_env(monkeypatch):
    # Arrange
    monkeypatch.setenv("NEUROGALLERY_DATA_DIR", "/tmp/data")
    monkeypatch.setenv("NEUROGALLERY_ARTIFACT_ROOT", "/tmp/artifacts")

    # Act
    cfg = default_config()

    # Assert
    assert cfg.data_dir == Path("/tmp/data")
    assert cfg.artifact_root == Path("/tmp/artifacts")
    assert cfg.subject == "subj01"
    assert cfg.expected_voxels == 15724


def test_with_overrides_is_immutable():
    # Arrange
    cfg = LabConfig(data_dir=Path("/a"), artifact_root=Path("/b"))

    # Act
    updated = with_overrides(cfg, diffusion_steps=50)

    # Assert
    assert updated.diffusion_steps == 50
    assert cfg.diffusion_steps == 20  # l'original est inchangé
    assert updated is not cfg
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `pytest lab/tests/unit/test_config.py -v`
Expected: FAIL avec `ModuleNotFoundError: No module named 'neurogallery.config'`.

- [ ] **Step 3: Écrire l'implémentation minimale**

`lab/neurogallery/config.py` :
```python
"""Configuration typée et immuable du lab. Aucune valeur en dur ailleurs."""
from __future__ import annotations

import dataclasses
import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class LabConfig:
    data_dir: Path
    artifact_root: Path
    subject: str = "subj01"
    test_set: str = "shared1000"
    expected_voxels: int = 15724
    diffusion_steps: int = 20
    dtype: str = "float16"
    enable_attention_slicing: bool = True
    enable_vae_tiling: bool = True
    enable_cpu_offload: bool = False
    thumb_size: int = 256


def default_config() -> LabConfig:
    data_dir = Path(os.environ.get("NEUROGALLERY_DATA_DIR",
                                   Path.home() / "neurogallery-data"))
    artifact_root = Path(os.environ.get("NEUROGALLERY_ARTIFACT_ROOT",
                                        Path.home() / "neurogallery-artifacts"))
    return LabConfig(data_dir=data_dir, artifact_root=artifact_root)


def with_overrides(cfg: LabConfig, **changes) -> LabConfig:
    """Renvoie une nouvelle copie de `cfg` avec les champs modifiés (immuable)."""
    return dataclasses.replace(cfg, **changes)
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `pytest lab/tests/unit/test_config.py -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lab/neurogallery/config.py lab/tests/unit/test_config.py
git commit -m "feat: typed immutable LabConfig with env-driven defaults"
```

---

### Task 3: Le contrat — `manifest.schema.json` + validateur

**Files:**
- Create: `manifest.schema.json` (à la racine du repo — partagé lab↔app)
- Create: `lab/neurogallery/build/__init__.py`
- Create: `lab/neurogallery/build/schema.py`
- Test: `lab/tests/unit/test_schema.py`
- Create: `lab/tests/fixtures/valid_manifest.json`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `def load_schema() -> dict` : charge `manifest.schema.json`.
  - `def validate_manifest(manifest: dict) -> None` : lève `jsonschema.ValidationError` si invalide, sinon renvoie `None`.
  - Contrat de forme d'un item (utilisé par `build` en Task 8) : voir schéma ci-dessous.

- [ ] **Step 1: Écrire `manifest.schema.json`**

`manifest.schema.json` (racine du repo) :
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "NeuroGallery manifest",
  "type": "object",
  "required": ["build", "items"],
  "additionalProperties": false,
  "properties": {
    "build": {
      "type": "object",
      "required": ["subject", "test_set", "methods", "profile"],
      "additionalProperties": false,
      "properties": {
        "subject": { "type": "string" },
        "test_set": { "type": "string" },
        "methods": {
          "type": "array",
          "items": { "type": "string", "enum": ["brain-diffuser", "mindeye2"] },
          "minItems": 1
        },
        "profile": { "type": "string", "enum": ["local", "public"] },
        "created": { "type": "string" }
      }
    },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "coco_id", "recon", "thumb", "gt", "metrics"],
        "additionalProperties": false,
        "properties": {
          "id": { "type": "string" },
          "coco_id": { "type": "integer" },
          "category": { "type": ["string", "null"] },
          "recon": {
            "type": "object",
            "minProperties": 1,
            "additionalProperties": { "type": "string" }
          },
          "thumb": { "type": "string" },
          "gt": {
            "type": "object",
            "required": ["displayable", "path", "license_name"],
            "additionalProperties": false,
            "properties": {
              "displayable": { "type": "boolean" },
              "path": { "type": ["string", "null"] },
              "license_name": { "type": "string" },
              "attribution": { "type": ["string", "null"] },
              "source_url": { "type": ["string", "null"] }
            }
          },
          "metrics": {
            "type": "object",
            "additionalProperties": {
              "type": "object",
              "additionalProperties": { "type": "number" }
            }
          }
        }
      }
    }
  }
}
```

- [ ] **Step 2: Écrire le test qui échoue**

`lab/tests/unit/test_schema.py` :
```python
import json
from pathlib import Path

import pytest
from jsonschema import ValidationError

from neurogallery.build.schema import load_schema, validate_manifest

FIXTURE = Path(__file__).parent.parent / "fixtures" / "valid_manifest.json"


def test_load_schema_has_expected_top_level():
    schema = load_schema()
    assert schema["properties"].keys() >= {"build", "items"}


def test_valid_manifest_passes():
    manifest = json.loads(FIXTURE.read_text())
    validate_manifest(manifest)  # ne doit rien lever


def test_missing_gt_displayable_fails():
    manifest = json.loads(FIXTURE.read_text())
    del manifest["items"][0]["gt"]["displayable"]
    with pytest.raises(ValidationError):
        validate_manifest(manifest)


def test_unknown_method_fails():
    manifest = json.loads(FIXTURE.read_text())
    manifest["build"]["methods"] = ["not-a-method"]
    with pytest.raises(ValidationError):
        validate_manifest(manifest)
```

- [ ] **Step 3: Écrire la fixture valide**

`lab/tests/fixtures/valid_manifest.json` :
```json
{
  "build": {
    "subject": "subj01",
    "test_set": "shared1000",
    "methods": ["brain-diffuser"],
    "profile": "local",
    "created": "2026-07-02T00:00:00Z"
  },
  "items": [
    {
      "id": "0001",
      "coco_id": 123456,
      "category": "animal",
      "recon": { "brain-diffuser": "recon/0001_brain-diffuser.png" },
      "thumb": "thumbs/0001.jpg",
      "gt": {
        "displayable": true,
        "path": "gt/0001.jpg",
        "license_name": "CC BY 2.0",
        "attribution": "Photo Flickr, CC BY 2.0",
        "source_url": "https://www.flickr.com/x"
      },
      "metrics": { "brain-diffuser": { "pixcorr": 0.27, "ssim": 0.41 } }
    }
  ]
}
```

- [ ] **Step 4: Lancer le test pour vérifier l'échec**

Run: `pytest lab/tests/unit/test_schema.py -v`
Expected: FAIL avec `ModuleNotFoundError: No module named 'neurogallery.build.schema'`.

- [ ] **Step 5: Écrire l'implémentation minimale**

`lab/neurogallery/build/__init__.py` :
```python
"""Orchestration du build → artefact."""
```

`lab/neurogallery/build/schema.py` :
```python
"""Chargement et validation du contrat manifest.schema.json (partagé lab↔app)."""
from __future__ import annotations

import functools
import json
from pathlib import Path

import jsonschema

# Racine du repo = 3 niveaux au-dessus de ce fichier
# (neurogallery/build/schema.py -> neurogallery -> lab -> repo).
_SCHEMA_PATH = Path(__file__).resolve().parents[3] / "manifest.schema.json"


@functools.lru_cache(maxsize=1)
def load_schema() -> dict:
    return json.loads(_SCHEMA_PATH.read_text(encoding="utf-8"))


def validate_manifest(manifest: dict) -> None:
    """Valide `manifest` contre le schéma. Lève jsonschema.ValidationError si invalide."""
    jsonschema.validate(instance=manifest, schema=load_schema())
```

- [ ] **Step 6: Lancer le test pour vérifier le succès**

Run: `pytest lab/tests/unit/test_schema.py -v`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add manifest.schema.json lab/neurogallery/build/__init__.py \
        lab/neurogallery/build/schema.py lab/tests/unit/test_schema.py \
        lab/tests/fixtures/valid_manifest.json
git commit -m "feat: manifest.schema.json contract + validator"
```

---

### Task 4: Module `licensing` (résolution de licence COCO, pur)

**Files:**
- Create: `lab/neurogallery/licensing/__init__.py`
- Create: `lab/neurogallery/licensing/resolve.py`
- Test: `lab/tests/unit/test_licensing.py`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `@dataclass(frozen=True) class GtLicense` : `displayable: bool`, `license_id: int`, `license_name: str`, `attribution: str | None`, `source_url: str | None`.
  - `def resolve_gt_license(coco_id: int, coco_index: dict[int, dict]) -> GtLicense` — pur. `coco_index` mappe `coco_id -> {"license_id": int, "flickr_url": str | None}`.
  - Constantes : `DISPLAYABLE_LICENSE_IDS = frozenset({4, 5, 7, 8})`, `ATTRIBUTION_REQUIRED_IDS = frozenset({4, 5})`, `LICENSE_NAMES: dict[int, str]`.

- [ ] **Step 1: Écrire le test qui échoue**

`lab/tests/unit/test_licensing.py` :
```python
from neurogallery.licensing.resolve import (
    GtLicense,
    resolve_gt_license,
    DISPLAYABLE_LICENSE_IDS,
)

INDEX = {
    100: {"license_id": 4, "flickr_url": "https://flickr.com/a"},   # CC BY -> displayable + attribution
    200: {"license_id": 7, "flickr_url": "https://flickr.com/b"},   # no known restrictions -> displayable, pas d'attribution requise
    300: {"license_id": 2, "flickr_url": "https://flickr.com/c"},   # CC BY-NC -> non affichable
    400: {"license_id": 99, "flickr_url": None},                    # inconnu -> non affichable
}


def test_cc_by_is_displayable_with_attribution():
    lic = resolve_gt_license(100, INDEX)
    assert lic.displayable is True
    assert lic.license_id == 4
    assert lic.license_name == "CC BY 2.0"
    assert lic.attribution is not None
    assert lic.source_url == "https://flickr.com/a"


def test_no_known_restrictions_displayable_without_attribution():
    lic = resolve_gt_license(200, INDEX)
    assert lic.displayable is True
    assert lic.attribution is None


def test_noncommercial_not_displayable():
    lic = resolve_gt_license(300, INDEX)
    assert lic.displayable is False
    assert lic.attribution is None


def test_unknown_license_not_displayable():
    lic = resolve_gt_license(400, INDEX)
    assert lic.displayable is False
    assert lic.license_name == "Unknown"


def test_missing_coco_id_is_not_displayable():
    lic = resolve_gt_license(999, INDEX)
    assert lic.displayable is False


def test_displayable_ids_constant():
    assert DISPLAYABLE_LICENSE_IDS == frozenset({4, 5, 7, 8})
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `pytest lab/tests/unit/test_licensing.py -v`
Expected: FAIL avec `ModuleNotFoundError`.

- [ ] **Step 3: Écrire l'implémentation minimale**

`lab/neurogallery/licensing/__init__.py` :
```python
"""Résolution de licence COCO (pur, sans I/O)."""
```

`lab/neurogallery/licensing/resolve.py` :
```python
"""Décide si une image COCO (vérité-terrain) peut être affichée publiquement.

Pur : aucune I/O. `coco_index` est fourni par l'appelant (chargé depuis les
annotations COCO). Voir spec §4.1.
"""
from __future__ import annotations

from dataclasses import dataclass

DISPLAYABLE_LICENSE_IDS = frozenset({4, 5, 7, 8})
ATTRIBUTION_REQUIRED_IDS = frozenset({4, 5})

LICENSE_NAMES: dict[int, str] = {
    1: "CC BY-NC-SA 2.0",
    2: "CC BY-NC 2.0",
    3: "CC BY-NC-ND 2.0",
    4: "CC BY 2.0",
    5: "CC BY-SA 2.0",
    6: "CC BY-ND 2.0",
    7: "No known copyright restrictions",
    8: "US Government Work",
}


@dataclass(frozen=True)
class GtLicense:
    displayable: bool
    license_id: int
    license_name: str
    attribution: str | None
    source_url: str | None


def resolve_gt_license(coco_id: int, coco_index: dict[int, dict]) -> GtLicense:
    entry = coco_index.get(coco_id)
    if entry is None:
        return GtLicense(False, -1, "Unknown", None, None)

    license_id = int(entry.get("license_id", -1))
    source_url = entry.get("flickr_url")
    license_name = LICENSE_NAMES.get(license_id, "Unknown")
    displayable = license_id in DISPLAYABLE_LICENSE_IDS

    attribution: str | None = None
    if displayable and license_id in ATTRIBUTION_REQUIRED_IDS:
        attribution = f"Photo Flickr, {license_name}"

    return GtLicense(displayable, license_id, license_name, attribution, source_url)
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `pytest lab/tests/unit/test_licensing.py -v`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lab/neurogallery/licensing/ lab/tests/unit/test_licensing.py
git commit -m "feat: pure COCO license resolution (displayable + attribution)"
```

---

### Task 5: Module `metrics` (math pure + interface d'extraction de features)

**Files:**
- Create: `lab/neurogallery/metrics/__init__.py`
- Create: `lab/neurogallery/metrics/core.py`
- Test: `lab/tests/unit/test_metrics.py`

**Interfaces:**
- Consumes: rien.
- Produces (toutes pures, sur `np.ndarray`) :
  - `def pixcorr(a: np.ndarray, b: np.ndarray) -> float` : corrélation de Pearson entre deux images aplaties (valeurs 0..1 ou 0..255).
  - `def ssim_score(a: np.ndarray, b: np.ndarray) -> float` : SSIM (via scikit-image).
  - `def cosine_similarity(u: np.ndarray, v: np.ndarray) -> float`.
  - `def two_way_identification(recon_emb: np.ndarray, gt_emb: np.ndarray, distractor_emb: np.ndarray) -> bool` : True si `recon` est plus proche (cosinus) de `gt` que du distracteur.
  - `class FeatureExtractor(Protocol)` : `def embed(self, image: np.ndarray) -> np.ndarray` — implémentations lourdes (AlexNet/CLIP/EfficientNet) hors de ce plan (Task GPU) ; ici seule l'interface + la math pure.

- [ ] **Step 1: Écrire le test qui échoue**

`lab/tests/unit/test_metrics.py` :
```python
import numpy as np

from neurogallery.metrics.core import (
    pixcorr,
    ssim_score,
    cosine_similarity,
    two_way_identification,
)


def test_pixcorr_identical_is_one():
    img = np.linspace(0, 1, 64 * 64).reshape(64, 64).astype(np.float32)
    assert pixcorr(img, img) == \
        __import__("pytest").approx(1.0, abs=1e-6)


def test_pixcorr_inverted_is_negative():
    img = np.linspace(0, 1, 64 * 64).reshape(64, 64).astype(np.float32)
    assert pixcorr(img, 1.0 - img) < 0


def test_ssim_identical_is_one():
    rng = np.random.default_rng(0)
    img = rng.random((64, 64, 3)).astype(np.float32)
    assert ssim_score(img, img) == __import__("pytest").approx(1.0, abs=1e-6)


def test_cosine_similarity_orthogonal_is_zero():
    u = np.array([1.0, 0.0, 0.0])
    v = np.array([0.0, 1.0, 0.0])
    assert cosine_similarity(u, v) == __import__("pytest").approx(0.0, abs=1e-6)


def test_two_way_identification_true_when_recon_closer_to_gt():
    gt = np.array([1.0, 0.0, 0.0])
    recon = np.array([0.9, 0.1, 0.0])   # proche de gt
    distractor = np.array([0.0, 1.0, 0.0])
    assert two_way_identification(recon, gt, distractor) is True


def test_two_way_identification_false_when_recon_closer_to_distractor():
    gt = np.array([1.0, 0.0, 0.0])
    recon = np.array([0.0, 0.9, 0.1])   # proche du distracteur
    distractor = np.array([0.0, 1.0, 0.0])
    assert two_way_identification(recon, gt, distractor) is False
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `pytest lab/tests/unit/test_metrics.py -v`
Expected: FAIL avec `ModuleNotFoundError`.

- [ ] **Step 3: Écrire l'implémentation minimale**

`lab/neurogallery/metrics/__init__.py` :
```python
"""Métriques de qualité de reconstruction (math pure + interface d'extraction)."""
```

`lab/neurogallery/metrics/core.py` :
```python
"""Métriques pures. La séparation math/extraction rend tout testable sans GPU.

Les métriques bas-niveau (pixcorr, ssim) comparent des images.
Les métriques haut-niveau (identification 2-voies) comparent des embeddings
produits par un `FeatureExtractor` (implémenté hors de ce plan, côté GPU).
"""
from __future__ import annotations

from typing import Protocol

import numpy as np
from skimage.metrics import structural_similarity


def pixcorr(a: np.ndarray, b: np.ndarray) -> float:
    """Corrélation de Pearson entre deux images aplaties."""
    x = a.astype(np.float64).ravel()
    y = b.astype(np.float64).ravel()
    if x.std() == 0 or y.std() == 0:
        return 0.0
    return float(np.corrcoef(x, y)[0, 1])


def ssim_score(a: np.ndarray, b: np.ndarray) -> float:
    """SSIM. Images HxW (gris) ou HxWxC (couleur), mêmes dimensions."""
    channel_axis = 2 if a.ndim == 3 else None
    data_range = float(max(a.max(), b.max()) - min(a.min(), b.min())) or 1.0
    return float(
        structural_similarity(a, b, channel_axis=channel_axis, data_range=data_range)
    )


def cosine_similarity(u: np.ndarray, v: np.ndarray) -> float:
    u = u.astype(np.float64).ravel()
    v = v.astype(np.float64).ravel()
    nu, nv = np.linalg.norm(u), np.linalg.norm(v)
    if nu == 0 or nv == 0:
        return 0.0
    return float(np.dot(u, v) / (nu * nv))


def two_way_identification(
    recon_emb: np.ndarray, gt_emb: np.ndarray, distractor_emb: np.ndarray
) -> bool:
    """True si la reconstruction ressemble plus à la vraie image qu'au distracteur."""
    return cosine_similarity(recon_emb, gt_emb) > cosine_similarity(
        recon_emb, distractor_emb
    )


class FeatureExtractor(Protocol):
    """Interface pour les extracteurs de features lourds (AlexNet/CLIP/EfficientNet).

    Implémentations concrètes = côté GPU, hors de ce plan. `embed` renvoie un
    vecteur 1-D. Cette séparation garde les métriques ci-dessus pures et testables.
    """

    def embed(self, image: np.ndarray) -> np.ndarray: ...
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `pytest lab/tests/unit/test_metrics.py -v`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lab/neurogallery/metrics/ lab/tests/unit/test_metrics.py
git commit -m "feat: pure reconstruction metrics + FeatureExtractor protocol"
```

---

### Task 6: Module `data` (chargement betas + contrôles d'intégrité)

**Files:**
- Create: `lab/neurogallery/data/__init__.py`
- Create: `lab/neurogallery/data/load.py`
- Test: `lab/tests/unit/test_data_load.py`

**Interfaces:**
- Consumes: `LabConfig` (Task 2).
- Produces:
  - `@dataclass(frozen=True) class SubjectData` : `betas: np.ndarray` (shape `[n_trials, n_voxels]`), `image_index: np.ndarray` (shape `[n_trials]`, coco index par essai), `test_trial_ids: np.ndarray` (indices des essais du set de test).
  - `def assert_betas_valid(betas: np.ndarray, expected_voxels: int) -> None` : lève `ValueError` si la forme est incohérente.
  - `def load_subject(betas_path: Path, meta_path: Path, expected_voxels: int) -> SubjectData` : lit un HDF5 (`betas`) + un `.npz` (`image_index`, `test_trial_ids`), valide, renvoie `SubjectData`.
  - `def make_synthetic_subject(n_trials: int, n_voxels: int, n_test: int, seed: int) -> SubjectData` : fixture déterministe pour les tests (pas d'I/O).

- [ ] **Step 1: Écrire le test qui échoue**

`lab/tests/unit/test_data_load.py` :
```python
import numpy as np
import pytest

from neurogallery.data.load import (
    SubjectData,
    assert_betas_valid,
    make_synthetic_subject,
)


def test_synthetic_subject_shapes():
    data = make_synthetic_subject(n_trials=20, n_voxels=100, n_test=5, seed=0)
    assert isinstance(data, SubjectData)
    assert data.betas.shape == (20, 100)
    assert data.image_index.shape == (20,)
    assert data.test_trial_ids.shape == (5,)


def test_synthetic_subject_is_deterministic():
    a = make_synthetic_subject(10, 50, 3, seed=42)
    b = make_synthetic_subject(10, 50, 3, seed=42)
    assert np.array_equal(a.betas, b.betas)


def test_assert_betas_valid_passes_on_expected_voxels():
    betas = np.zeros((10, 15724), dtype=np.float32)
    assert_betas_valid(betas, expected_voxels=15724)  # ne lève rien


def test_assert_betas_valid_rejects_wrong_voxel_count():
    betas = np.zeros((10, 999), dtype=np.float32)
    with pytest.raises(ValueError, match="voxels"):
        assert_betas_valid(betas, expected_voxels=15724)


def test_assert_betas_valid_rejects_non_2d():
    betas = np.zeros((10,), dtype=np.float32)
    with pytest.raises(ValueError, match="2D"):
        assert_betas_valid(betas, expected_voxels=15724)
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `pytest lab/tests/unit/test_data_load.py -v`
Expected: FAIL avec `ModuleNotFoundError`.

- [ ] **Step 3: Écrire l'implémentation minimale**

`lab/neurogallery/data/__init__.py` :
```python
"""Chargement des données NSD (subj01) + contrôles d'intégrité."""
```

`lab/neurogallery/data/load.py` :
```python
"""Chargement des betas subj01 (HDF5) et métadonnées, avec validation aux frontières.

Ne rehéberge jamais les données : lit uniquement des fichiers locaux (cf. Global
Constraints). `make_synthetic_subject` fournit une fixture déterministe pour les tests.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np


@dataclass(frozen=True)
class SubjectData:
    betas: np.ndarray          # [n_trials, n_voxels]
    image_index: np.ndarray    # [n_trials] -> coco index par essai
    test_trial_ids: np.ndarray # [n_test] -> indices des essais de test


def assert_betas_valid(betas: np.ndarray, expected_voxels: int) -> None:
    if betas.ndim != 2:
        raise ValueError(f"betas doit être 2D [n_trials, n_voxels], reçu ndim={betas.ndim}")
    n_voxels = betas.shape[1]
    if n_voxels != expected_voxels:
        raise ValueError(
            f"nombre de voxels inattendu : {n_voxels} != {expected_voxels} attendu "
            "(ROI nsdgeneral subj01)"
        )


def load_subject(betas_path: Path, meta_path: Path, expected_voxels: int) -> SubjectData:
    import h5py  # import local : dépendance lourde, hors des tests purs

    with h5py.File(betas_path, "r") as f:
        betas = np.asarray(f["betas"][:], dtype=np.float32)
    assert_betas_valid(betas, expected_voxels)

    meta = np.load(meta_path)
    image_index = np.asarray(meta["image_index"], dtype=np.int64)
    test_trial_ids = np.asarray(meta["test_trial_ids"], dtype=np.int64)

    if image_index.shape[0] != betas.shape[0]:
        raise ValueError(
            f"cohérence essai→image rompue : {image_index.shape[0]} indices "
            f"pour {betas.shape[0]} essais"
        )
    return SubjectData(betas=betas, image_index=image_index, test_trial_ids=test_trial_ids)


def make_synthetic_subject(
    n_trials: int, n_voxels: int, n_test: int, seed: int
) -> SubjectData:
    rng = np.random.default_rng(seed)
    betas = rng.standard_normal((n_trials, n_voxels)).astype(np.float32)
    image_index = np.arange(n_trials, dtype=np.int64)
    test_trial_ids = np.arange(n_test, dtype=np.int64)
    return SubjectData(betas=betas, image_index=image_index, test_trial_ids=test_trial_ids)
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `pytest lab/tests/unit/test_data_load.py -v`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lab/neurogallery/data/ lab/tests/unit/test_data_load.py
git commit -m "feat: NSD subject loader with integrity checks + synthetic fixture"
```

---

### Task 7: Module `reconstruct` (protocole + FakeReconstructor)

**Files:**
- Create: `lab/neurogallery/reconstruct/__init__.py`
- Create: `lab/neurogallery/reconstruct/base.py`
- Create: `lab/neurogallery/reconstruct/fake.py`
- Test: `lab/tests/unit/test_fake_reconstructor.py`

**Interfaces:**
- Consumes: rien (numpy/Pillow).
- Produces:
  - `class Reconstructor(Protocol)` : `def reconstruct(self, betas: np.ndarray) -> PIL.Image.Image` (une ligne de betas `[n_voxels]` → image). _NB : raffinement vs le protocole illustratif de la spec — `build` ne consomme que `reconstruct` ; l'entraînement éventuel (ridge de Brain-Diffuser) est interne à cette implémentation, pas dans le protocole._
  - `class FakeReconstructor` : produit une image **déterministe** (couleur unie dérivée du hash des betas), taille `(size, size)`. Constructeur : `FakeReconstructor(size: int = 64)`.

- [ ] **Step 1: Écrire le test qui échoue**

`lab/tests/unit/test_fake_reconstructor.py` :
```python
import numpy as np
from PIL import Image

from neurogallery.reconstruct.fake import FakeReconstructor


def test_fake_returns_pil_image_of_expected_size():
    rec = FakeReconstructor(size=64)
    img = rec.reconstruct(np.zeros(100, dtype=np.float32))
    assert isinstance(img, Image.Image)
    assert img.size == (64, 64)


def test_fake_is_deterministic_for_same_betas():
    rec = FakeReconstructor(size=32)
    betas = np.arange(50, dtype=np.float32)
    a = np.asarray(rec.reconstruct(betas))
    b = np.asarray(rec.reconstruct(betas))
    assert np.array_equal(a, b)


def test_fake_differs_for_different_betas():
    rec = FakeReconstructor(size=32)
    a = np.asarray(rec.reconstruct(np.zeros(50, dtype=np.float32)))
    b = np.asarray(rec.reconstruct(np.ones(50, dtype=np.float32)))
    assert not np.array_equal(a, b)
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `pytest lab/tests/unit/test_fake_reconstructor.py -v`
Expected: FAIL avec `ModuleNotFoundError`.

- [ ] **Step 3: Écrire l'implémentation minimale**

`lab/neurogallery/reconstruct/__init__.py` :
```python
"""Moteur de reconstruction : protocole + implémentations (stratégie)."""
```

`lab/neurogallery/reconstruct/base.py` :
```python
"""Interface unique de reconstruction. `build` ne dépend que de `reconstruct`."""
from __future__ import annotations

from typing import Protocol

import numpy as np
from PIL import Image


class Reconstructor(Protocol):
    def reconstruct(self, betas: np.ndarray) -> Image.Image:
        """betas d'un essai [n_voxels] -> image reconstruite (PIL)."""
        ...
```

`lab/neurogallery/reconstruct/fake.py` :
```python
"""Reconstructeur factice, déterministe, sans GPU — pour tester l'orchestration."""
from __future__ import annotations

import hashlib

import numpy as np
from PIL import Image


class FakeReconstructor:
    def __init__(self, size: int = 64) -> None:
        self._size = size

    def reconstruct(self, betas: np.ndarray) -> Image.Image:
        digest = hashlib.sha256(np.ascontiguousarray(betas, dtype=np.float32).tobytes())
        r, g, b = digest.digest()[:3]
        return Image.new("RGB", (self._size, self._size), (r, g, b))
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `pytest lab/tests/unit/test_fake_reconstructor.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lab/neurogallery/reconstruct/ lab/tests/unit/test_fake_reconstructor.py
git commit -m "feat: Reconstructor protocol + deterministic FakeReconstructor"
```

---

### Task 8: Module `build` (orchestration → artefact) + test d'intégration

**Files:**
- Create: `lab/neurogallery/build/artifact.py`
- Test: `lab/tests/integration/test_build_artifact.py`

**Interfaces:**
- Consumes: `LabConfig` (T2), `validate_manifest` (T3), `resolve_gt_license` + `GtLicense` (T4), `SubjectData` (T6), `Reconstructor` + `FakeReconstructor` (T7).
- Produces:
  - `@dataclass(frozen=True) class BuildItem` : `id: str`, `coco_id: int`, `category: str | None`, `betas: np.ndarray`, `gt_image: PIL.Image.Image | None`.
  - `def build_artifact(cfg, reconstructor, method, items, coco_index, profile, out_dir) -> Path` :
    - `method: str` ∈ {"brain-diffuser","mindeye2"} ; `items: list[BuildItem]` ; `coco_index: dict[int, dict]` ; `profile: str` ∈ {"local","public"} ; `out_dir: Path`.
    - Écrit `recon/`, `thumbs/`, `gt/` (selon profil+licence), `manifest.json` (validé), `metrics_summary.json`. Renvoie `out_dir`.
    - Idempotent/reprenable : si `recon/<id>_<method>.png` existe déjà, l'item est réutilisé (pas de re-reconstruction).
    - Métriques calculées (pixcorr, ssim) uniquement si `gt_image` est fourni.

- [ ] **Step 1: Écrire le test d'intégration qui échoue**

`lab/tests/integration/test_build_artifact.py` :
```python
import json
from pathlib import Path

import numpy as np
from PIL import Image

from neurogallery.build.artifact import BuildItem, build_artifact
from neurogallery.build.schema import validate_manifest
from neurogallery.config import LabConfig
from neurogallery.reconstruct.fake import FakeReconstructor


def _make_items(n: int) -> list[BuildItem]:
    items = []
    for i in range(n):
        gt = Image.new("RGB", (64, 64), (i * 10 % 256, 0, 0))
        items.append(
            BuildItem(
                id=f"{i:04d}",
                coco_id=100 + i,
                category="animal",
                betas=np.full(50, float(i), dtype=np.float32),
                gt_image=gt,
            )
        )
    return items


COCO_INDEX = {
    100: {"license_id": 4, "flickr_url": "https://flickr.com/a"},   # affichable
    101: {"license_id": 2, "flickr_url": "https://flickr.com/b"},   # NON affichable
    102: {"license_id": 7, "flickr_url": "https://flickr.com/c"},   # affichable
}


def _cfg(tmp_path: Path) -> LabConfig:
    return LabConfig(data_dir=tmp_path / "data", artifact_root=tmp_path / "art")


def test_build_produces_valid_manifest_local(tmp_path):
    out = tmp_path / "artifact"
    result = build_artifact(
        cfg=_cfg(tmp_path),
        reconstructor=FakeReconstructor(size=64),
        method="brain-diffuser",
        items=_make_items(3),
        coco_index=COCO_INDEX,
        profile="local",
        out_dir=out,
    )
    assert result == out
    manifest = json.loads((out / "manifest.json").read_text())
    validate_manifest(manifest)  # ne doit rien lever
    assert manifest["build"]["profile"] == "local"
    assert len(manifest["items"]) == 3
    # profil local : toutes les vérités-terrain présentes
    for item in manifest["items"]:
        assert item["gt"]["path"] is not None
        assert (out / item["recon"]["brain-diffuser"]).exists()
        assert (out / item["thumb"]).exists()
        assert (out / item["gt"]["path"]).exists()
    # métriques calculées
    assert "pixcorr" in manifest["items"][0]["metrics"]["brain-diffuser"]


def test_build_public_hides_restrictive_gt(tmp_path):
    out = tmp_path / "artifact_public"
    build_artifact(
        cfg=_cfg(tmp_path),
        reconstructor=FakeReconstructor(size=64),
        method="brain-diffuser",
        items=_make_items(3),
        coco_index=COCO_INDEX,
        profile="public",
        out_dir=out,
    )
    manifest = json.loads((out / "manifest.json").read_text())
    validate_manifest(manifest)
    by_id = {it["id"]: it for it in manifest["items"]}
    # coco 100 (id 4) affichable
    assert by_id["0000"]["gt"]["displayable"] is True
    assert by_id["0000"]["gt"]["path"] is not None
    assert (out / by_id["0000"]["gt"]["path"]).exists()
    # coco 101 (id 2, NC) NON affichable : pas de fichier, path null
    assert by_id["0001"]["gt"]["displayable"] is False
    assert by_id["0001"]["gt"]["path"] is None
    # reconstruction toujours présente même quand la GT est masquée
    assert (out / by_id["0001"]["recon"]["brain-diffuser"]).exists()


def test_build_is_resumable(tmp_path):
    out = tmp_path / "artifact_resume"
    args = dict(
        cfg=_cfg(tmp_path),
        method="brain-diffuser",
        items=_make_items(2),
        coco_index=COCO_INDEX,
        profile="local",
        out_dir=out,
    )
    build_artifact(reconstructor=FakeReconstructor(size=64), **args)
    recon_path = out / "recon" / "0000_brain-diffuser.png"
    mtime_before = recon_path.stat().st_mtime_ns
    # 2e run : ne doit pas réécrire les png déjà présents
    build_artifact(reconstructor=FakeReconstructor(size=64), **args)
    assert recon_path.stat().st_mtime_ns == mtime_before
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `pytest lab/tests/integration/test_build_artifact.py -v`
Expected: FAIL avec `ModuleNotFoundError: No module named 'neurogallery.build.artifact'`.

- [ ] **Step 3: Écrire l'implémentation minimale**

`lab/neurogallery/build/artifact.py` :
```python
"""Orchestration : items -> artefact (recon, thumbs, gt, manifest, résumé).

Idempotent/reprenable, immuable (n'écrase pas un png déjà produit), valide le
manifest contre le schéma avant écriture (fail fast). Voir spec §3.4 / §4.
"""
from __future__ import annotations

import json
import shutil
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

from neurogallery.config import LabConfig
from neurogallery.build.schema import validate_manifest
from neurogallery.licensing.resolve import resolve_gt_license
from neurogallery.metrics.core import pixcorr, ssim_score
from neurogallery.reconstruct.base import Reconstructor


@dataclass(frozen=True)
class BuildItem:
    id: str
    coco_id: int
    category: str | None
    betas: np.ndarray
    gt_image: Image.Image | None


def _compute_metrics(recon: Image.Image, gt: Image.Image | None) -> dict[str, float]:
    if gt is None:
        return {}
    recon_arr = np.asarray(recon.convert("RGB"), dtype=np.float32) / 255.0
    gt_resized = gt.convert("RGB").resize(recon.size)
    gt_arr = np.asarray(gt_resized, dtype=np.float32) / 255.0
    return {"pixcorr": pixcorr(recon_arr, gt_arr), "ssim": ssim_score(recon_arr, gt_arr)}


def _build_one_item(
    item: BuildItem, reconstructor: Reconstructor, method: str,
    coco_index: dict[int, dict], profile: str, out_dir: Path, thumb_size: int,
) -> dict:
    recon_rel = f"recon/{item.id}_{method}.png"
    recon_path = out_dir / recon_rel
    if recon_path.exists():                       # reprise : réutiliser l'existant
        recon_img = Image.open(recon_path).convert("RGB")
    else:
        recon_img = reconstructor.reconstruct(item.betas).convert("RGB")
        recon_path.parent.mkdir(parents=True, exist_ok=True)
        recon_img.save(recon_path)

    thumb_rel = f"thumbs/{item.id}.jpg"
    thumb_path = out_dir / thumb_rel
    if not thumb_path.exists():
        thumb_path.parent.mkdir(parents=True, exist_ok=True)
        thumb = recon_img.copy()
        thumb.thumbnail((thumb_size, thumb_size))
        thumb.save(thumb_path, "JPEG", quality=85)

    lic = resolve_gt_license(item.coco_id, coco_index)
    show_gt = item.gt_image is not None and (profile == "local" or lic.displayable)
    gt_rel: str | None = None
    if show_gt:
        gt_rel = f"gt/{item.id}.jpg"
        gt_path = out_dir / gt_rel
        if not gt_path.exists():
            gt_path.parent.mkdir(parents=True, exist_ok=True)
            item.gt_image.convert("RGB").save(gt_path, "JPEG", quality=90)

    metrics = _compute_metrics(recon_img, item.gt_image)

    return {
        "id": item.id,
        "coco_id": item.coco_id,
        "category": item.category,
        "recon": {method: recon_rel},
        "thumb": thumb_rel,
        "gt": {
            "displayable": bool(lic.displayable),
            "path": gt_rel,
            "license_name": lic.license_name,
            "attribution": lic.attribution,
            "source_url": lic.source_url,
        },
        "metrics": {method: metrics},
    }


def _summarize(items: list[dict], method: str) -> dict:
    keys = ["pixcorr", "ssim"]
    means: dict[str, float] = {}
    for k in keys:
        vals = [it["metrics"][method][k] for it in items if k in it["metrics"].get(method, {})]
        if vals:
            means[k] = float(np.mean(vals))
    return {method: means}


def build_artifact(
    cfg: LabConfig,
    reconstructor: Reconstructor,
    method: str,
    items: list[BuildItem],
    coco_index: dict[int, dict],
    profile: str,
    out_dir: Path,
) -> Path:
    if method not in ("brain-diffuser", "mindeye2"):
        raise ValueError(f"méthode inconnue : {method}")
    if profile not in ("local", "public"):
        raise ValueError(f"profil inconnu : {profile}")

    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_items = [
        _build_one_item(it, reconstructor, method, coco_index, profile, out_dir, cfg.thumb_size)
        for it in items
    ]

    manifest = {
        "build": {
            "subject": cfg.subject,
            "test_set": cfg.test_set,
            "methods": [method],
            "profile": profile,
        },
        "items": manifest_items,
    }
    validate_manifest(manifest)  # fail fast avant écriture

    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (out_dir / "metrics_summary.json").write_text(
        json.dumps(_summarize(manifest_items, method), indent=2), encoding="utf-8"
    )
    return out_dir
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `pytest lab/tests/integration/test_build_artifact.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Lancer toute la suite déterministe**

Run: `pytest`
Expected: PASS (tous les tests des tâches 2-8, aucun test `gpu`).

- [ ] **Step 6: Commit**

```bash
git add lab/neurogallery/build/artifact.py lab/tests/integration/test_build_artifact.py
git commit -m "feat: artifact builder (manifest, thumbs, license-gated GT, resumable)"
```

---

### Task 9: `BrainDiffuserReconstructor` (wrapper GPU) + scripts d'acquisition et de build

**Files:**
- Create: `lab/neurogallery/reconstruct/brain_diffuser.py`
- Create: `lab/scripts/acquire_data.py`
- Create: `lab/scripts/run_build.py`
- Test: `lab/tests/integration/test_brain_diffuser_smoke.py` (marqué `@gpu`)

**Interfaces:**
- Consumes: `Reconstructor` (T7), `LabConfig` (T2), `SubjectData` + `load_subject` (T6), `BuildItem` + `build_artifact` (T8).
- Produces:
  - `class BrainDiffuserReconstructor` implémentant `reconstruct(betas) -> Image`. Constructeur `BrainDiffuserReconstructor(cfg: LabConfig, weights_dir: Path, device: str = "cuda")` : charge les poids de régression ridge pré-ajustés + VDVAE + Versatile Diffusion, en `fp16`, **une seule carte**, avec `enable_attention_slicing()` / `enable_vae_tiling()` selon `cfg`.
  - `scripts/acquire_data.py` : télécharge sélectivement les fichiers subj01 depuis `pscotti/mindeyev2` (HuggingFace) vers `cfg.data_dir`.
  - `scripts/run_build.py` : CLI `--method {brain-diffuser} --profile {local,public} --limit N` assemblant les `BuildItem` du set de test et appelant `build_artifact`.

> **Note d'intégration :** `BrainDiffuserReconstructor` enveloppe le repo externe
> `ozcelikfu/brain-diffuser` (MIT). Le repo suppose 2 GPU par défaut — forcer un
> `device` unique et `torch_dtype=float16`. Les poids ridge sont **pré-ajustés hors
> ligne** (étape `fit`, interne à cette classe via une méthode `fit_from_subject`,
> non requise par le protocole `Reconstructor`). Ce wrapper n'est pas couvert par des
> tests unitaires (sortie stochastique + modèles lourds) : seul un **smoke test `@gpu`**
> vérifie qu'il charge et sort une image de la bonne forme.

- [ ] **Step 1: Écrire le smoke test `@gpu` (ne tourne pas en CI)**

`lab/tests/integration/test_brain_diffuser_smoke.py` :
```python
"""Smoke test du vrai reconstructeur — nécessite GPU + poids. Lancer : pytest -m gpu"""
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

pytestmark = pytest.mark.gpu


def test_brain_diffuser_reconstructs_an_image():
    import torch

    from neurogallery.config import default_config, with_overrides
    from neurogallery.reconstruct.brain_diffuser import BrainDiffuserReconstructor

    if not torch.cuda.is_available():
        pytest.skip("pas de GPU")

    cfg = default_config()
    weights_dir = cfg.data_dir / "brain-diffuser-weights"
    if not weights_dir.exists():
        pytest.skip("poids Brain-Diffuser absents (voir scripts/acquire_data.py)")

    rec = BrainDiffuserReconstructor(with_overrides(cfg, diffusion_steps=5), weights_dir)
    n_voxels = cfg.expected_voxels
    img = rec.reconstruct(np.zeros(n_voxels, dtype=np.float32))
    assert isinstance(img, Image.Image)
    assert img.size[0] > 0 and img.size[1] > 0
```

- [ ] **Step 2: Vérifier que le smoke test est bien exclu par défaut**

Run: `pytest lab/tests/integration/test_brain_diffuser_smoke.py -v`
Expected: `deselected` (marqueur `gpu` exclu par `addopts = -m 'not gpu'`) — aucun échec.

- [ ] **Step 3: Écrire le wrapper `BrainDiffuserReconstructor`**

`lab/neurogallery/reconstruct/brain_diffuser.py` :
```python
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
```

> Si l'API exacte de `VersatileDiffusionDualGuidedPipeline` diffère de la version
> installée, l'implémenteur adapte la construction du guidage en suivant le README de
> `ozcelikfu/brain-diffuser` et les docs `diffusers` (Context7) — l'interface publique
> (`reconstruct(betas) -> Image`) reste identique, donc `build` n'est pas impacté.

- [ ] **Step 4: Écrire le script d'acquisition des données**

`lab/scripts/acquire_data.py` :
```python
"""Télécharge sélectivement les fichiers subj01 depuis pscotti/mindeyev2 (HuggingFace).

Ne rehéberge jamais les données : écrit sous cfg.data_dir (FS Linux, hors dépôt).
Usage : python lab/scripts/acquire_data.py
"""
from __future__ import annotations

from huggingface_hub import hf_hub_download

from neurogallery.config import default_config

REPO_ID = "pscotti/mindeyev2"
REPO_TYPE = "dataset"
SUBJ01_FILES = [
    "betas_all_subj01_fp32_renorm.hdf5",
    "coco_images_224_float16.hdf5",
]


def main() -> None:
    cfg = default_config()
    cfg.data_dir.mkdir(parents=True, exist_ok=True)
    for filename in SUBJ01_FILES:
        path = hf_hub_download(
            repo_id=REPO_ID, repo_type=REPO_TYPE, filename=filename,
            local_dir=str(cfg.data_dir),
        )
        print(f"téléchargé : {path}")
    print("Rappel : lire les Terms & Conditions NSD avant toute publication (spec §8).")


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Écrire le script de build (CLI)**

`lab/scripts/run_build.py` :
```python
"""Assemble les BuildItem du set de test et lance build_artifact.

Usage : python lab/scripts/run_build.py --method brain-diffuser --profile local --limit 50
"""
from __future__ import annotations

import argparse
import datetime as dt
from pathlib import Path

import numpy as np
from PIL import Image

from neurogallery.build.artifact import BuildItem, build_artifact
from neurogallery.config import default_config
from neurogallery.data.load import load_subject
from neurogallery.reconstruct.brain_diffuser import BrainDiffuserReconstructor


def _load_coco_index(cfg) -> dict[int, dict]:
    # Chargé depuis les annotations COCO locales : coco_id -> {license_id, flickr_url}.
    import json
    idx: dict[int, dict] = {}
    ann_path = cfg.data_dir / "coco_annotations.json"
    data = json.loads(ann_path.read_text())
    for img in data["images"]:
        idx[int(img["id"])] = {"license_id": int(img["license"]),
                               "flickr_url": img.get("flickr_url")}
    return idx


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--method", choices=["brain-diffuser"], default="brain-diffuser")
    parser.add_argument("--profile", choices=["local", "public"], default="local")
    parser.add_argument("--limit", type=int, default=50)
    args = parser.parse_args()

    cfg = default_config()
    data = load_subject(
        betas_path=cfg.data_dir / "betas_all_subj01_fp32_renorm.hdf5",
        meta_path=cfg.data_dir / f"{cfg.subject}_meta.npz",
        expected_voxels=cfg.expected_voxels,
    )
    coco_index = _load_coco_index(cfg)
    images_h5 = cfg.data_dir / "coco_images_224_float16.hdf5"

    import h5py
    items: list[BuildItem] = []
    with h5py.File(images_h5, "r") as f:
        images = f["images"]
        for trial_id in data.test_trial_ids[: args.limit]:
            coco_id = int(data.image_index[trial_id])
            arr = (np.asarray(images[trial_id]) * 255).astype("uint8")
            gt = Image.fromarray(np.moveaxis(arr, 0, -1)) if arr.shape[0] == 3 else Image.fromarray(arr)
            items.append(BuildItem(id=f"{int(trial_id):04d}", coco_id=coco_id,
                                   category=None, betas=data.betas[trial_id], gt_image=gt))

    reconstructor = BrainDiffuserReconstructor(cfg, cfg.data_dir / "brain-diffuser-weights")
    stamp = dt.datetime.now(dt.UTC).strftime("%Y%m%d-%H%M%S")
    out_dir = cfg.artifact_root / f"artifact_{stamp}"
    result = build_artifact(cfg=cfg, reconstructor=reconstructor, method=args.method,
                            items=items, coco_index=coco_index, profile=args.profile,
                            out_dir=out_dir)
    print(f"artefact écrit : {result}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 6: Lancer la suite déterministe (le smoke `@gpu` reste désélectionné)**

Run: `pytest`
Expected: PASS (tous les tests non-gpu). Le smoke test est `deselected`.

- [ ] **Step 7: Commit**

```bash
git add lab/neurogallery/reconstruct/brain_diffuser.py lab/scripts/acquire_data.py \
        lab/scripts/run_build.py lab/tests/integration/test_brain_diffuser_smoke.py
git commit -m "feat: BrainDiffuser reconstructor wrapper + acquire/build scripts (M1)"
```

- [ ] **Step 8 (manuel, hors CI) : validation de bout en bout sur GPU**

Une fois les données acquises (`acquire_data.py`) et les poids ridge ajustés :
```bash
python lab/scripts/check_toolchain.py            # capability (12, 0)
pytest -m gpu                                    # smoke test du reconstructeur
python lab/scripts/run_build.py --method brain-diffuser --profile local --limit 50
```
Expected: un dossier `artifact_<timestamp>/` avec `manifest.json` valide, `recon/`, `thumbs/`, `gt/`, `metrics_summary.json` — **la chaîne complète vit** (jalon M1).

---

## Self-Review

**1. Couverture de la spec :**
- §3.0 sanity-check toolchain → Task 1 ✅
- §3.1 acquisition subj01 (pscotti/mindeyev2) → Task 9 (`acquire_data.py`) ✅
- §3.2 protocole `Reconstructor` + Fake + BrainDiffuser → Tasks 7, 9 ✅ (MindEye2 = Plan 3, hors périmètre — noté)
- §3.3 métriques (pixcorr, ssim, identification 2-voies ; features derrière interface) → Task 5 ✅ (AlexNet/CLIP/EfficientNet concrets = côté GPU, Plan 3 quand utilisés pour les métriques haut-niveau)
- §3.4 build idempotent/reprenable, profils, méthodes → Task 8 ✅
- §3.5 intégrité + versionnage horodaté → Tasks 6, 9 ✅ (repli MindEye2→BrainDiffuser = Plan 3, dépend de MindEye2)
- §4 licences + format artefact + schéma → Tasks 3, 4, 8 ✅
- §6.2 contrat validé à l'écriture → Task 3 + Task 8 ✅
- §6.4 stratégie de test (unit purs, intégration FakeReconstructor, smoke @gpu) → Tasks 2-9 ✅
- **Hors périmètre (assumé, autres plans) :** toute l'app (§5) = Plan 2 ; MindEye2 + profil public déployé + métriques haut-niveau + repli auto = Plan 3.

**2. Placeholders :** aucun `TBD/TODO`. Les deux notes d'adaptation (API Versatile Diffusion, ajustement ridge) pointent une source concrète et préservent l'interface publique — ce ne sont pas des placeholders de logique non spécifiée.

**3. Cohérence des types :** `Reconstructor.reconstruct(betas) -> Image` utilisé identiquement en T7/T8/T9 ; `build_artifact(...)` signature identique entre T8 (def) et T9 (appel) ; `resolve_gt_license(coco_id, coco_index) -> GtLicense` cohérent T4→T8 ; `BuildItem` champs identiques T8→T9 ; `LabConfig` champs cohérents T2→T8/T9.

_Raffinement assumé vs spec : le protocole `Reconstructor` n'expose que `reconstruct` (et non `fit`), car `build` ne consomme que la reconstruction ; l'ajustement ridge est interne à `BrainDiffuserReconstructor`. Documenté en Task 7 et Task 9._
