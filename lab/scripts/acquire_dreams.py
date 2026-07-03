"""Download the preprocessed bdpy dream dataset and print an inspection summary.

The exact preprocessed-file URL is confirmed from brainliner
(http://brainliner.jp/data/brainliner/Human_Dream_Decoding). Set DREAM_URLS below
after locating the supplement's preprocessed bdpy files.
"""
from __future__ import annotations

import sys
import urllib.request

from neurogallery.config import default_config

DREAM_DIR = default_config().data_dir / "dream"
# Fill from brainliner supplement (one .h5 bdpy file per subject):
DREAM_URLS: dict[str, str] = {}


def download() -> None:
    DREAM_DIR.mkdir(parents=True, exist_ok=True)
    if not DREAM_URLS:
        print("Set DREAM_URLS (from brainliner supplement) before downloading.")
        return
    for name, url in DREAM_URLS.items():
        dest = DREAM_DIR / name
        if dest.exists():
            print(f"  have {name}")
            continue
        print(f"  downloading {name} ...")
        urllib.request.urlretrieve(url, dest)


def inspect() -> None:
    import bdpy
    for f in sorted(DREAM_DIR.glob("*.h5")):
        b = bdpy.BData(str(f))
        print(f"\n== {f.name} ==")
        print("metadata keys:", b.metadata.key[:40])
        print("dataset shape:", b.dataset.shape)


if __name__ == "__main__":
    download()
    if "--inspect" in sys.argv:
        inspect()
