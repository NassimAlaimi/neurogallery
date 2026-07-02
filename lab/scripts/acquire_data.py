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
