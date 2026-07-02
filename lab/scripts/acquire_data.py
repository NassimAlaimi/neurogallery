"""Télécharge sélectivement les fichiers subj01 depuis pscotti/mindeyev2 (HuggingFace).

Ne rehéberge jamais les données : écrit sous cfg.data_dir (FS Linux, hors dépôt).
Usage : python lab/scripts/acquire_data.py
"""
from __future__ import annotations

from huggingface_hub import hf_hub_download

from neurogallery.config import default_config

REPO_ID = "pscotti/mindeyev2"
REPO_TYPE = "dataset"

# Gros fichiers : betas subj01 (~1,9 Go) + toutes les images NSD 73k (~22 Go).
BIG_FILES = [
    "betas_all_subj01_fp32_renorm.hdf5",
    "coco_images_224_float16.hdf5",
]
# Métadonnées (petites) consommées par prepare_metadata.py / fit_ridge.py / run_build.py :
META_FILES = [
    "shared1000.npy",                  # masque bool 73k des images de test
    "test_73k_images.npy",             # index 73k des 1000 images de test
    "subj01_annots.npy",               # caption par ligne de betas (cible texte du ridge)
    "COCO_73k_semantic_cluster.npy",   # catégorie sémantique par image 73k
    "semantic_cluster_names.npy",
]
# Webdatasets subj01 : SEULEMENT les tableaux behav (mapping ligne-betas -> image 73k),
# pas d'images/betas dedans → petit. train/0..39 + test/0.
WDS_FILES = [f"wds/subj01/train/{i}.tar" for i in range(40)] + ["wds/subj01/test/0.tar"]


def main() -> None:
    cfg = default_config()
    cfg.data_dir.mkdir(parents=True, exist_ok=True)
    for filename in BIG_FILES + META_FILES + WDS_FILES:
        path = hf_hub_download(
            repo_id=REPO_ID, repo_type=REPO_TYPE, filename=filename,
            local_dir=str(cfg.data_dir),
        )
        print(f"téléchargé : {path}")
    print("\nPrêt. Étapes suivantes :")
    print("  python scripts/prepare_metadata.py   # produit subj01_meta.npz")
    print("  python scripts/fit_ridge.py          # produit ridge_weights.npz (GPU)")
    print("  python scripts/run_build.py --profile local --limit 20   # reconstructions (GPU)")
    print("Rappel : lire les Terms & Conditions NSD avant toute publication (spec §8).")


if __name__ == "__main__":
    main()
