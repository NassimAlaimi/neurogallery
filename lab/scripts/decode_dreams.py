"""Decode real sleep fMRI and write the Dreams data contract.

Usage:
  python scripts/decode_dreams.py --subject Subject3            # decode + write JSON
  python scripts/decode_dreams.py --subject Subject3 --render   # also render images (GPU)
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from neurogallery.config import default_config
from neurogallery.dreams import decode as dc
from neurogallery.dreams.bdpy_adapter import DecodeConfig, extract_arrays

APP_DREAMS = Path(__file__).resolve().parents[2] / "app" / "public" / "dreams"


def write_json(manifest: dict, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / "dreams.json"
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return path


def _reports_for(selected, reported_names):
    # A neutral reconstructed sentence from the reported categories (no fabricated quote).
    return {idx: f"Reported: {', '.join(names)}." for idx, names in reported_names.items()}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--subject", default="Subject3")
    ap.add_argument("--n", type=int, default=3, help="awakenings to feature")
    ap.add_argument("--render", action="store_true", help="also render images (GPU)")
    ap.add_argument("--out", type=Path, default=APP_DREAMS)
    args = ap.parse_args()

    import bdpy
    path = default_config().data_dir / "dream" / f"{args.subject}.h5"
    cfg = DecodeConfig()
    X_p, Y_p, X_s, Y_s, names = extract_arrays(bdpy.BData(str(path)), cfg)

    decoders = dc.fit_category_decoders(X_p, Y_p)
    scores = dc.predict_scores(decoders, X_s)
    acc = dc.pairwise_identification_accuracy(scores, Y_s) * 100.0
    print(f"pairwise identification accuracy: {acc:.1f}%")

    # Only awakenings that carry a reported category are eligible: to_dream_examples
    # raises on a sample with no reported category (we never fabricate a report).
    eligible = [i for i in range(X_s.shape[0]) if int(Y_s[i].sum()) > 0]
    selected = eligible[:args.n]
    if not selected:
        raise SystemExit("No sleep awakening with a reported category found; nothing to write.")
    reported_map = {i: [names[j] for j in range(len(names)) if Y_s[i, j] == 1] for i in selected}
    reports = _reports_for(selected, reported_map)
    exs = dc.to_dream_examples(selected, names, scores, Y_s, reports, subject=args.subject, k=cfg.top_k)
    manifest = dc.assemble_decoded_manifest(exs, acc)

    path_out = write_json(manifest, args.out)
    print(f"dreams.json written -> {path_out}")

    if args.render:
        from make_dreams import render_from_manifest  # optional helper; see note
        render_from_manifest(manifest, args.out)


if __name__ == "__main__":
    main()
