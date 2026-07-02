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
