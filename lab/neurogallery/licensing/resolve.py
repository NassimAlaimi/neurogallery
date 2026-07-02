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

    raw_license_id = entry.get("license_id")
    license_id = int(raw_license_id) if raw_license_id is not None else -1
    source_url = entry.get("flickr_url")
    license_name = LICENSE_NAMES.get(license_id, "Unknown")
    displayable = license_id in DISPLAYABLE_LICENSE_IDS

    attribution: str | None = None
    if displayable and license_id in ATTRIBUTION_REQUIRED_IDS:
        attribution = f"Photo Flickr, {license_name}"

    return GtLicense(displayable, license_id, license_name, attribution, source_url)
