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
