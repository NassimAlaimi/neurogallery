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
