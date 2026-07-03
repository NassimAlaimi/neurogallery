# NeuroGallery — Plan 4: Real Dream Decoding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decode categories from real sleep fMRI (Horikawa 2013) with a Python (bdpy + sklearn) reproduction, and surface **reported vs decoded** per awakening in the Dreams tab, replacing curated examples with genuine results.

**Architecture:** Lab (offline, user's machine): acquire bdpy data → decode (pure sklearn logic, synthetic-fixture tested) → render decoded categories via existing `make_dreams` → write the extended data contract. App: extend `dreams.ts` + Dreams components to show reported vs decoded with graceful fallback to today's curated single-list. The real bdpy load + full decode is a `@pytest.mark.data`/`@pytest.mark.gpu` step the user runs manually.

**Tech Stack:** Python (bdpy, scikit-learn, numpy, jsonschema, pytest); React 18 + Vite + TS, Vitest, framer-motion.

## Global Constraints

- **Honesty (non-negotiable, tested in DOM):** Real & sourced = sleep fMRI + `reported` categories (Horikawa 2013 dataset) + `decoded` categories (OUR reproduction, run on the real sleep fMRI). `pairwise_accuracy_pct` = the value we actually measured (chance = 50%). Generated/illustrative = the rendered image (always "illustrative render"). The decoder is OUR reproduction, stated as such. Never "seen image"/"real dream". No cherry-picking only perfect hits.
- **Back-compat / graceful fallback:** an example has EITHER curated `categories` OR real `reported`+`decoded`. When `decoded` is absent, the tab renders exactly today's curated single-list behavior, so the committed app works before the real decode is run.
- **Isolation:** dedicated `dreams.json`/`dreams.schema.json`; never touch `manifest.json`, `manifest.schema.json`, `app/src/lib/manifest.ts`.
- **No real data in CI:** all pure logic is tested with synthetic fixtures. bdpy load, download, and rendering are excluded-by-default markers (`@pytest.mark.data`, `@pytest.mark.gpu`) run manually by the user.
- **Scope A only:** category-level decoding. Image reconstruction from sleep betas (B) is out of scope.
- Lab tests live in `lab/tests/unit/`, run via `cd lab && python -m pytest` (or `uv run python -m pytest`); markers `gpu` and (new) `data` are deselected by default. App: `cd app && npx vitest run`; type/build gate `npm run build` (NOT `tsc -b --noEmit`).

---

## File Structure

**Lab — create:**
- `lab/neurogallery/dreams/decode.py` — pure decode logic + contract assembly (fit/predict/top_k/accuracy/to_dream_examples/assemble_decoded_manifest).
- `lab/neurogallery/dreams/bdpy_adapter.py` — bdpy-specific extraction (`DecodeConfig`, `extract_arrays`), isolated + `@data`-tested only.
- `lab/scripts/acquire_dreams.py` — download preprocessed bdpy data + print inspection summary (`@data` / manual).
- `lab/scripts/decode_dreams.py` — CLI: load → decode → write dreams.json (+ render).
- `lab/tests/unit/test_dreams_decode.py` — synthetic-fixture tests for decode.py.
- `lab/tests/unit/test_decode_dreams_smoke.py` — api-surface test (non-data) + `@data` smoke.

**Lab — modify:**
- `dreams.schema.json` (repo root) — add optional `reported`/`decoded`/`subject`/`study.decoder`; make `categories` optional; require `categories` OR `decoded`.
- `lab/pyproject.toml` — add `bdpy` + `scikit-learn` (already present) to gpu/data extras; register `data` marker.

**App — create:**
- `app/src/features/dreams/CategoryCompare.tsx` — reported vs decoded chips with overlap highlight.
- `app/src/features/dreams/CategoryCompare.test.tsx`

**App — modify:**
- `app/src/lib/dreams.ts` — extend types + `validateDreams` + helpers (`hasDecoding`, `displayCategories`, `matchedSet`).
- `app/src/lib/dreams.test.ts` — cover new fields + helpers.
- `app/src/features/dreams/DreamPlate.tsx` + `DreamPlate.test.tsx` — show comparison when decoded present, else fallback.
- `app/src/features/dreams/Awakening.tsx` + `Awakening.test.tsx` — decoding phase shows comparison when present; truth-card copy.
- `app/src/features/dreams/DreamsPage.tsx` + `DreamsPage.test.tsx` — pipeline/copy use decoded, metric framing.
- `app/src/features/dreams/dreams.css` — `.cat-compare`, `.cat-row-label`, `.cat-chip.match`.

---

## Task 1: Extend the data contract (schema + build) for reported/decoded

Make the contract accept real examples (reported+decoded+subject) while keeping curated examples valid. No decode logic yet.

**Files:**
- Modify: `dreams.schema.json`
- Modify: `lab/neurogallery/dreams/build.py`
- Test: `lab/tests/unit/test_dreams_build.py` (extend)

**Interfaces:**
- Produces: schema accepting optional `reported: string[]`(≥1), `decoded: string[]`(≥1), `subject: string`, `study.decoder: string`; `categories` now optional; each example requires `categories` OR `decoded`. `to_dreams_manifest()` unchanged (curated). New pure helper `example_from_decode(id, featured, subject, reported, decoded, report_reconstructed) -> dict`.

- [ ] **Step 1: Write failing tests**

Add to `lab/tests/unit/test_dreams_build.py`:

```python
def test_schema_accepts_decoded_example():
    from neurogallery.dreams.build import example_from_decode
    ex = example_from_decode(
        id="dream-01", featured=True, subject="Subject3",
        reported=["person", "street"], decoded=["person", "car", "street"],
        report_reconstructed="A street with a figure.",
    )
    manifest = {
        "study": {**__import__("neurogallery.dreams.examples", fromlist=["STUDY"]).STUDY,
                  "decoder": "our reproduction of Horikawa 2013"},
        "examples": [ex],
        "study_metrics": {"pairwise_accuracy_pct": 58.0, "note": "measured, chance 50%"},
        "sources": [{"label": "Horikawa 2013", "url": "https://x"}],
    }
    jsonschema.validate(manifest, SCHEMA)


def test_example_from_decode_shape():
    from neurogallery.dreams.build import example_from_decode
    ex = example_from_decode(
        id="d1", featured=False, subject="Subject1",
        reported=["book"], decoded=["book", "room"], report_reconstructed="A room.",
    )
    assert ex["reported"] == ["book"]
    assert ex["decoded"] == ["book", "room"]
    assert ex["subject"] == "Subject1"
    assert ex["render"] == "renders/d1.webp"
    assert ex["thumb"] == "thumbs/d1.jpg"
    assert "categories" not in ex  # real example has decoded, not curated categories


def test_curated_manifest_still_valid():
    manifest = to_dreams_manifest()
    jsonschema.validate(manifest, SCHEMA)  # existing curated data still conforms
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd lab && python -m pytest tests/unit/test_dreams_build.py -v`
Expected: FAIL (`example_from_decode` undefined; schema rejects `reported`/`decoded`/`subject`/`decoder`).

- [ ] **Step 3: Update the schema**

In `dreams.schema.json`: (a) in `study.properties` add `"decoder": { "type": "string", "minLength": 1 }` (study stays additionalProperties:false; `decoder` NOT added to study.required). (b) Replace the `examples.items` object with:

```json
        "type": "object",
        "required": ["id", "featured", "report_reconstructed", "render", "thumb"],
        "additionalProperties": false,
        "anyOf": [
          { "required": ["categories"] },
          { "required": ["decoded"] }
        ],
        "properties": {
          "id": { "type": "string", "minLength": 1 },
          "featured": { "type": "boolean" },
          "subject": { "type": "string", "minLength": 1 },
          "categories": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 1 } },
          "reported": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 1 } },
          "decoded": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 1 } },
          "report_reconstructed": { "type": "string", "minLength": 1 },
          "render": { "type": "string", "minLength": 1 },
          "thumb": { "type": "string", "minLength": 1 }
        }
```

- [ ] **Step 4: Add `example_from_decode` to build.py**

Append to `lab/neurogallery/dreams/build.py`:

```python
def example_from_decode(
    id: str, featured: bool, subject: str,
    reported: list[str], decoded: list[str], report_reconstructed: str,
) -> dict:
    """Build a real (decoded) dream example dict for the manifest.

    `render`/`thumb` derived from id. Holds `reported` (dataset ground truth)
    and `decoded` (our reproduction) instead of curated `categories`.
    """
    return {
        "id": id,
        "featured": bool(featured),
        "subject": subject,
        "reported": list(reported),
        "decoded": list(decoded),
        "report_reconstructed": report_reconstructed,
        "render": f"renders/{id}.webp",
        "thumb": f"thumbs/{id}.jpg",
    }
```

- [ ] **Step 5: Run — expect PASS**

Run: `cd lab && python -m pytest tests/unit/test_dreams_build.py -v`
Expected: PASS (all, including the 3 new).

- [ ] **Step 6: Commit**

```bash
git add dreams.schema.json lab/neurogallery/dreams/build.py lab/tests/unit/test_dreams_build.py
git commit -m "feat(dreams): extend contract for reported/decoded examples (back-compat)"
```

---

## Task 2: Pure decode logic (`decode.py`)

The sklearn reproduction: train per-category decoders on awake patterns, predict on sleep, evaluate. No bdpy, no I/O — pure arrays.

**Files:**
- Create: `lab/neurogallery/dreams/decode.py`
- Test: `lab/tests/unit/test_dreams_decode.py`

**Interfaces:**
- Produces:
  - `fit_category_decoders(X_perc, Y_perc) -> list[LogisticRegression]` (one per category column)
  - `predict_scores(decoders, X_sleep) -> np.ndarray` shape `[n_sleep, n_cat]` (decision_function scores)
  - `top_k(scores_row, category_names, k=3) -> list[str]`
  - `pairwise_identification_accuracy(scores, Y_true, rng_seed=0) -> float` in [0,1]

- [ ] **Step 1: Write failing tests**

Create `lab/tests/unit/test_dreams_decode.py`:

```python
import numpy as np

from neurogallery.dreams.decode import (
    fit_category_decoders, predict_scores, top_k, pairwise_identification_accuracy,
)


def _synthetic(n=200, n_vox=40, n_cat=3, seed=0):
    """Each category k is driven by voxel block k -> linearly separable."""
    rng = np.random.default_rng(seed)
    Y = (rng.random((n, n_cat)) > 0.5).astype(int)
    X = rng.normal(0, 0.3, (n, n_vox))
    block = n_vox // n_cat
    for k in range(n_cat):
        X[:, k * block:(k + 1) * block] += Y[:, [k]] * 2.0  # signal for category k
    return X, Y


def test_decoders_recover_planted_category():
    X, Y = _synthetic()
    decoders = fit_category_decoders(X, Y)
    scores = predict_scores(decoders, X)
    assert scores.shape == Y.shape
    # AUC-ish: mean score for positives > negatives, per category
    for k in range(Y.shape[1]):
        pos = scores[Y[:, k] == 1, k].mean()
        neg = scores[Y[:, k] == 0, k].mean()
        assert pos > neg


def test_top_k_returns_highest_categories():
    names = ["person", "street", "car"]
    row = np.array([2.0, -1.0, 0.5])
    assert top_k(row, names, k=2) == ["person", "car"]


def test_pairwise_accuracy_perfect_and_chance():
    Y = np.array([[1, 0, 0], [0, 1, 0], [0, 0, 1]] * 20)
    # perfect scores == labels -> accuracy 1.0
    assert pairwise_identification_accuracy(Y.astype(float), Y, rng_seed=1) == 1.0
    # random scores -> around chance 0.5
    rng = np.random.default_rng(2)
    acc = pairwise_identification_accuracy(rng.normal(size=Y.shape), Y, rng_seed=3)
    assert 0.3 < acc < 0.7
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd lab && python -m pytest tests/unit/test_dreams_decode.py -v`
Expected: FAIL (`neurogallery.dreams.decode` missing).

- [ ] **Step 3: Implement `decode.py`**

Create `lab/neurogallery/dreams/decode.py`:

```python
"""Pure decode logic: per-category linear decoders (reproduction of Horikawa 2013).

No bdpy, no I/O. Trains on awake perception patterns, predicts on sleep patterns.
"""
from __future__ import annotations

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline


def fit_category_decoders(X_perc: np.ndarray, Y_perc: np.ndarray) -> list:
    """One standardized L2 logistic decoder per category column of Y_perc."""
    decoders = []
    for k in range(Y_perc.shape[1]):
        y = Y_perc[:, k]
        clf = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000, C=1.0))
        if len(np.unique(y)) < 2:
            clf = None  # degenerate column (all present or all absent)
        else:
            clf.fit(X_perc, y)
        decoders.append(clf)
    return decoders


def predict_scores(decoders: list, X_sleep: np.ndarray) -> np.ndarray:
    """Per-category decision scores for each sleep sample. Degenerate cols -> 0."""
    cols = []
    for clf in decoders:
        if clf is None:
            cols.append(np.zeros(X_sleep.shape[0]))
        else:
            cols.append(clf.decision_function(X_sleep))
    return np.column_stack(cols)


def top_k(scores_row: np.ndarray, category_names: list[str], k: int = 3) -> list[str]:
    """The k highest-scoring category names for one sample (descending)."""
    order = np.argsort(np.asarray(scores_row))[::-1][:k]
    return [category_names[i] for i in order]


def pairwise_identification_accuracy(
    scores: np.ndarray, Y_true: np.ndarray, rng_seed: int = 0
) -> float:
    """Horikawa's metric: for each sample, is its score vector more correlated
    with its own label vector than with a randomly paired other sample's labels?
    Chance = 0.5. Deterministic given rng_seed.
    """
    scores = np.asarray(scores, dtype=float)
    Y = np.asarray(Y_true, dtype=float)
    n = scores.shape[0]
    if n < 2:
        return 0.0
    rng = np.random.default_rng(rng_seed)
    perm = rng.permutation(n)

    def corr(a, b):
        a = a - a.mean(); b = b - b.mean()
        denom = np.linalg.norm(a) * np.linalg.norm(b)
        return float(a @ b / denom) if denom > 0 else 0.0

    correct = 0
    for i in range(n):
        j = perm[i]
        if j == i:
            j = (i + 1) % n
        self_corr = corr(scores[i], Y[i])
        other_corr = corr(scores[i], Y[j])
        if self_corr > other_corr:
            correct += 1
    return correct / n
```

- [ ] **Step 4: Run — expect PASS**

Run: `cd lab && python -m pytest tests/unit/test_dreams_decode.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lab/neurogallery/dreams/decode.py lab/tests/unit/test_dreams_decode.py
git commit -m "feat(dreams): pure category-decode logic (fit/predict/top_k/pairwise accuracy)"
```

---

## Task 3: Contract assembly from decode output + manifest

Turn decode outputs into real dream examples and a full manifest. Pure + tested.

**Files:**
- Modify: `lab/neurogallery/dreams/decode.py`
- Test: `lab/tests/unit/test_dreams_decode.py` (extend)

**Interfaces:**
- Consumes: `example_from_decode` (Task 1), `top_k` (Task 2), `examples.STUDY/SOURCES`.
- Produces:
  - `to_dream_examples(selected, category_names, scores, Y_true, reports, subject, k=3) -> list[dict]` where `selected: list[int]` are sleep-sample indices, `reports: dict[int,str]` maps index→`report_reconstructed`, first selected is `featured`.
  - `assemble_decoded_manifest(examples_list, accuracy_pct) -> dict` conforming to `dreams.schema.json`.

- [ ] **Step 1: Write failing tests**

Add to `lab/tests/unit/test_dreams_decode.py`:

```python
import json, jsonschema
from pathlib import Path
from neurogallery.dreams.decode import to_dream_examples, assemble_decoded_manifest

SCHEMA = json.loads((Path(__file__).resolve().parents[3] / "dreams.schema.json").read_text())


def test_to_dream_examples_builds_reported_and_decoded():
    names = ["person", "street", "car"]
    scores = np.array([[2.0, 1.0, -1.0], [0.0, 0.0, 3.0]])
    Y = np.array([[1, 1, 0], [0, 0, 1]])
    reports = {0: "A street.", 1: "A car."}
    exs = to_dream_examples([0, 1], names, scores, Y, reports, subject="Subject3", k=2)
    assert len(exs) == 2
    assert exs[0]["featured"] is True and exs[1]["featured"] is False
    assert exs[0]["reported"] == ["person", "street"]   # from Y row 0
    assert exs[0]["decoded"] == ["person", "street"]     # top-2 of scores row 0
    assert exs[0]["subject"] == "Subject3"
    assert all("seed" not in e for e in exs)


def test_assemble_decoded_manifest_validates():
    names = ["person", "street", "car"]
    scores = np.array([[2.0, 1.0, -1.0]])
    Y = np.array([[1, 0, 0]])
    exs = to_dream_examples([0], names, scores, Y, {0: "A person."}, subject="S1", k=2)
    manifest = assemble_decoded_manifest(exs, accuracy_pct=57.5)
    jsonschema.validate(manifest, SCHEMA)
    assert manifest["study_metrics"]["pairwise_accuracy_pct"] == 57.5
    assert "decoder" in manifest["study"]
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd lab && python -m pytest tests/unit/test_dreams_decode.py -v`
Expected: FAIL (`to_dream_examples`/`assemble_decoded_manifest` undefined).

- [ ] **Step 3: Implement in `decode.py`**

Append to `lab/neurogallery/dreams/decode.py`:

```python
def _reported_from_row(y_row, category_names):
    return [category_names[i] for i in range(len(category_names)) if y_row[i] == 1]


def to_dream_examples(selected, category_names, scores, Y_true, reports, subject, k=3):
    """Build real dream example dicts for the given sleep-sample indices.

    First selected index is `featured`. `reported` = that sample's true categories;
    `decoded` = top-k of its score row. `reports[idx]` -> report_reconstructed.
    """
    from neurogallery.dreams.build import example_from_decode

    out = []
    for rank, idx in enumerate(selected):
        reported = _reported_from_row(Y_true[idx], category_names)
        if not reported:
            reported = [top_k(Y_true[idx], category_names, 1)[0]]  # never empty
        out.append(example_from_decode(
            id=f"dream-{rank + 1:02d}",
            featured=(rank == 0),
            subject=subject,
            reported=reported,
            decoded=top_k(scores[idx], category_names, k),
            report_reconstructed=reports[idx],
        ))
    return out


def assemble_decoded_manifest(examples_list: list[dict], accuracy_pct: float) -> dict:
    """Full dreams.json dict from real decoded examples + measured accuracy."""
    from neurogallery.dreams import examples as ex_mod

    study = dict(ex_mod.STUDY)
    study["decoder"] = "our reproduction of Horikawa 2013 (per-category logistic regression)"
    return {
        "study": study,
        "examples": examples_list,
        "study_metrics": {
            "pairwise_accuracy_pct": round(float(accuracy_pct), 1),
            "note": (
                "Pairwise identification accuracy of our reproduction on the real "
                "sleep set (chance 50%). Measured, not the paper's figure."
            ),
        },
        "sources": [dict(s) for s in ex_mod.SOURCES],
    }
```

- [ ] **Step 4: Run — expect PASS**

Run: `cd lab && python -m pytest tests/unit/test_dreams_decode.py -v`
Expected: PASS (5 tests total).

- [ ] **Step 5: Commit**

```bash
git add lab/neurogallery/dreams/decode.py lab/tests/unit/test_dreams_decode.py
git commit -m "feat(dreams): assemble real reported/decoded examples + measured-accuracy manifest"
```

---

## Task 4: bdpy adapter + acquire/decode CLIs (manual/data-gated)

The dataset-specific glue and the runnable scripts. The real bdpy load is `@data` (excluded by default). Only the api surface is asserted in CI.

**Files:**
- Create: `lab/neurogallery/dreams/bdpy_adapter.py`
- Create: `lab/scripts/acquire_dreams.py`
- Create: `lab/scripts/decode_dreams.py`
- Modify: `lab/pyproject.toml`
- Test: `lab/tests/unit/test_decode_dreams_smoke.py`

**Interfaces:**
- Consumes: everything from Tasks 1-3; `make_dreams.render_images` (existing).
- Produces: `DecodeConfig` dataclass; `extract_arrays(bdata, cfg) -> tuple`; CLI `decode_dreams.py` with `write_json(...)` + `main()`.

- [ ] **Step 1: Register the `data` marker + deps**

In `lab/pyproject.toml`, under `[tool.pytest.ini_options].markers` add:
`"data: tests needing the downloaded dream dataset (excluded by default)",`
and set `addopts = "-m 'not gpu and not data'"`.
Under the gpu/data dependency extras, ensure `bdpy` and `scikit-learn` are listed (scikit-learn already is).

- [ ] **Step 2: Write the api-surface test (non-data)**

Create `lab/tests/unit/test_decode_dreams_smoke.py`:

```python
import importlib.util
from pathlib import Path

import pytest

_SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "decode_dreams.py"


def _load():
    spec = importlib.util.spec_from_file_location("decode_dreams", _SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_script_exposes_api():
    mod = _load()
    assert callable(mod.main)
    assert callable(mod.write_json)


def test_adapter_config_defaults():
    from neurogallery.dreams.bdpy_adapter import DecodeConfig
    cfg = DecodeConfig()
    # config carries the dataset-specific keys, overridable after inspection
    assert hasattr(cfg, "roi") and hasattr(cfg, "label_key") and hasattr(cfg, "sleep_flag")


@pytest.mark.data
def test_extract_arrays_on_real_bdpy():
    # Runs only with the downloaded dataset present. See scripts/acquire_dreams.py.
    from neurogallery.dreams.bdpy_adapter import DecodeConfig, extract_arrays
    import bdpy
    from neurogallery.config import default_config
    path = default_config().data_dir / "dream" / "Subject3.h5"
    if not path.exists():
        pytest.skip("dream bdpy data not downloaded")
    X_p, Y_p, X_s, Y_s, names = extract_arrays(bdpy.BData(str(path)), DecodeConfig())
    assert X_p.shape[1] == X_s.shape[1] and Y_p.shape[1] == len(names)
```

- [ ] **Step 3: Run — expect FAIL**

Run: `cd lab && python -m pytest tests/unit/test_decode_dreams_smoke.py -v`
Expected: FAIL (script + adapter missing). The `@data` test is deselected.

- [ ] **Step 4: Implement the adapter**

Create `lab/neurogallery/dreams/bdpy_adapter.py`:

```python
"""bdpy-specific extraction, isolated so the rest of the decode is data-agnostic.

The exact keys (ROI name, label column, perception/sleep split flag) come from
`scripts/acquire_dreams.py`'s inspection output; override DecodeConfig accordingly.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass
class DecodeConfig:
    roi: str = "ROI_VC = 1"          # voxel-selection expression (visual cortex)
    label_key: str = "Label"          # metadata column holding category synset/id
    sleep_flag: str = "Sleep"         # design column: 1 = sleep sample, 0 = perception
    top_k: int = 3


def extract_arrays(bdata, cfg: DecodeConfig):
    """Return (X_perc, Y_perc, X_sleep, Y_sleep, category_names) from a bdpy BData.

    Y_* are multi-hot [n, n_cat] over the sorted unique category labels.
    """
    X = bdata.select(cfg.roi)                       # [n_samples, n_vox]
    labels = bdata.get_label(cfg.label_key)        # length n_samples (category per sample)
    sleep = np.asarray(bdata.select(cfg.sleep_flag)).ravel().astype(int)

    category_names = sorted({str(l) for l in labels})
    index = {name: i for i, name in enumerate(category_names)}
    Y = np.zeros((len(labels), len(category_names)), dtype=int)
    for row, l in enumerate(labels):
        Y[row, index[str(l)]] = 1

    perc = sleep == 0
    slp = sleep == 1
    return X[perc], Y[perc], X[slp], Y[slp], category_names
```

Note: `bdata.get_label` / `.select` are bdpy's API; confirm exact method names against the inspection output in Step 7 and adjust this one file if the installed bdpy differs.

- [ ] **Step 5: Implement `acquire_dreams.py`**

Create `lab/scripts/acquire_dreams.py`:

```python
"""Download the preprocessed bdpy dream dataset and print an inspection summary.

The exact preprocessed-file URL is confirmed from brainliner
(http://brainliner.jp/data/brainliner/Human_Dream_Decoding). Set DREAM_URLS below
after locating the supplement's preprocessed bdpy files.
"""
from __future__ import annotations

import sys
import urllib.request
from pathlib import Path

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
```

- [ ] **Step 6: Implement `decode_dreams.py`**

Create `lab/scripts/decode_dreams.py`:

```python
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


def _reports_for(selected, decoded_names):
    # A neutral reconstructed sentence from the reported categories (no fabricated quote).
    return {idx: f"Reported: {', '.join(names)}." for idx, names in decoded_names.items()}


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

    selected = list(range(min(args.n, X_s.shape[0])))
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
```

Note on rendering: the existing `make_dreams.render_images` iterates `examples.EXAMPLES`. For decoded examples, add a thin `render_from_manifest(manifest, out_dir)` to `make_dreams.py` that loops `manifest["examples"]`, builds the prompt from each example's `decoded` list via `build_prompt`, and writes `renders/<id>.webp` + `thumbs/<id>.jpg` (same body as `render_images`). Keep it `@gpu`/manual.

- [ ] **Step 7: Run api test — expect PASS; document inspection**

Run: `cd lab && python -m pytest tests/unit/test_decode_dreams_smoke.py -v`
Expected: PASS (`test_script_exposes_api`, `test_adapter_config_defaults`; the `@data` test deselected).

Manual (user, later): `python scripts/acquire_dreams.py --inspect` prints bdpy metadata keys → set `DREAM_URLS` and adjust `DecodeConfig` defaults / `extract_arrays` method names to match the installed bdpy + file.

- [ ] **Step 8: Commit**

```bash
git add lab/neurogallery/dreams/bdpy_adapter.py lab/scripts/acquire_dreams.py lab/scripts/decode_dreams.py lab/pyproject.toml lab/tests/unit/test_decode_dreams_smoke.py
git commit -m "feat(dreams): bdpy adapter + acquire/decode CLIs (data-gated smokes)"
```

---

## Task 5: App data layer — types, validation, helpers

**Files:**
- Modify: `app/src/lib/dreams.ts`
- Test: `app/src/lib/dreams.test.ts` (extend)

**Interfaces:**
- Produces: `DreamExample` gains optional `subject?: string`, `reported?: string[]`, `decoded?: string[]`; `categories?` now optional. `DreamStudy` gains `decoder?: string`. Helpers: `hasDecoding(ex): boolean`, `displayCategories(ex): string[]`, `matchedSet(a, b): Set<string>`.

- [ ] **Step 1: Write failing tests**

Add to `app/src/lib/dreams.test.ts`:

```typescript
import { hasDecoding, displayCategories, matchedSet } from "./dreams";

const decodedEx = {
  id: "dream-01", featured: true, subject: "Subject3",
  reported: ["person", "street"], decoded: ["person", "car"],
  report_reconstructed: "A street.", render: "renders/dream-01.webp", thumb: "thumbs/dream-01.jpg",
};

describe("dreams decoded helpers", () => {
  it("validates a decoded example (no curated categories)", () => {
    const d = { ...valid, examples: [decodedEx] };
    expect(validateDreams(d)).toEqual(d);
  });

  it("rejects an example with neither categories nor decoded", () => {
    const ex = { ...decodedEx } as Record<string, unknown>;
    delete ex.decoded;
    expect(() => validateDreams({ ...valid, examples: [ex] })).toThrow(/categories.*decoded|decoded.*categories/i);
  });

  it("hasDecoding / displayCategories pick decoded over curated", () => {
    expect(hasDecoding(decodedEx)).toBe(true);
    expect(displayCategories(decodedEx)).toEqual(["person", "car"]);
    expect(hasDecoding(valid.examples[0])).toBe(false);
    expect(displayCategories(valid.examples[0])).toEqual(valid.examples[0].categories);
  });

  it("matchedSet is the case-insensitive overlap", () => {
    const m = matchedSet(["Person", "street"], ["person", "car"]);
    expect(m.has("person")).toBe(true);
    expect(m.has("street")).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd app && npx vitest run src/lib/dreams.test.ts`
Expected: FAIL (helpers missing; decoded example rejected).

- [ ] **Step 3: Update `dreams.ts`**

In `app/src/lib/dreams.ts`:

(a) Extend interfaces:
```typescript
export interface DreamStudy {
  title: string; authors: string; venue: string; year: number;
  subjects: number; awakenings_per_subject: string;
  window_seconds: number; window_volumes: number; source_url: string;
  decoder?: string;
}

export interface DreamExample {
  id: string;
  featured: boolean;
  subject?: string;
  categories?: string[];
  reported?: string[];
  decoded?: string[];
  report_reconstructed: string;
  render: string;
  thumb: string;
}
```

(b) In `validateDreams`, replace the per-example category checks with:
```typescript
    const hasCats = Array.isArray(raw.categories) && raw.categories.length > 0;
    const hasDec = Array.isArray(raw.decoded) && raw.decoded.length > 0;
    assert(hasCats || hasDec, `example ${i} must have non-empty categories or decoded`);
    for (const key of ["categories", "reported", "decoded"] as const) {
      if (raw[key] !== undefined) {
        assert(Array.isArray(raw[key]) && (raw[key] as unknown[]).length > 0, `example ${i}.${key} must be non-empty`);
        for (const c of raw[key] as unknown[]) assert(typeof c === "string", `example ${i}.${key}`);
      }
    }
    assert(raw.subject === undefined || typeof raw.subject === "string", `example ${i}.subject`);
```
(Keep the existing `id`/`featured`/`report_reconstructed`/`render`/`thumb` asserts; remove the old mandatory `categories` assert.)

(c) Allow `study.decoder`: after the existing study asserts, add
```typescript
  assert(s.decoder === undefined || typeof s.decoder === "string", "study.decoder");
```

(d) Append helpers:
```typescript
export function hasDecoding(ex: DreamExample): boolean {
  return Array.isArray(ex.decoded) && ex.decoded.length > 0;
}

export function displayCategories(ex: DreamExample): string[] {
  return hasDecoding(ex) ? (ex.decoded as string[]) : (ex.categories ?? []);
}

export function matchedSet(a: string[], b: string[]): Set<string> {
  const lb = new Set(b.map((x) => x.toLowerCase()));
  return new Set(a.map((x) => x.toLowerCase()).filter((x) => lb.has(x)));
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `cd app && npx vitest run src/lib/dreams.test.ts`
Expected: PASS (existing + 4 new).

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/dreams.ts app/src/lib/dreams.test.ts
git commit -m "feat(dreams): app types/validation for reported/decoded + helpers"
```

---

## Task 6: App display — CategoryCompare + wiring + styles + verify

Show reported vs decoded with overlap highlight; fall back to curated single list. Then verify build + full suite.

**Files:**
- Create: `app/src/features/dreams/CategoryCompare.tsx` + `CategoryCompare.test.tsx`
- Modify: `DreamPlate.tsx`, `DreamPlate.test.tsx`, `Awakening.tsx`, `Awakening.test.tsx`, `DreamsPage.tsx`, `dreams.css`

**Interfaces:**
- Consumes: `matchedSet`, `hasDecoding`, `displayCategories`, `DreamExample`.
- Produces: `CategoryCompare({ reported, decoded })`.

- [ ] **Step 1: Write failing test for CategoryCompare**

Create `app/src/features/dreams/CategoryCompare.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryCompare } from "./CategoryCompare";

describe("CategoryCompare", () => {
  it("shows reported and decoded rows with honest labels", () => {
    render(<CategoryCompare reported={["person", "street"]} decoded={["person", "car"]} />);
    expect(screen.getByText(/Reported \(dataset\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Decoded \(our reproduction\)/i)).toBeInTheDocument();
    // overlapping category "person" appears in both rows
    expect(screen.getAllByText("person").length).toBe(2);
    expect(screen.getByText("street")).toBeInTheDocument();
    expect(screen.getByText("car")).toBeInTheDocument();
  });

  it("marks matched chips with the match class", () => {
    const { container } = render(<CategoryCompare reported={["person"]} decoded={["person", "car"]} />);
    const matched = container.querySelectorAll(".cat-chip.match");
    expect(matched.length).toBe(2); // 'person' in both rows
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd app && npx vitest run src/features/dreams/CategoryCompare.test.tsx`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement CategoryCompare**

Create `app/src/features/dreams/CategoryCompare.tsx`:

```tsx
import { matchedSet } from "../../lib/dreams";

/** Reported (dataset) vs decoded (our reproduction) chips, with overlap highlighted. */
export function CategoryCompare({ reported, decoded }: { reported: string[]; decoded: string[] }) {
  const match = matchedSet(reported, decoded);
  const chip = (c: string, i: number, prefix: string) => (
    <span key={`${prefix}-${c}-${i}`} className={`cat-chip${match.has(c.toLowerCase()) ? " match" : ""}`}>{c}</span>
  );
  return (
    <div className="cat-compare">
      <div className="cat-row">
        <span className="cat-row-label ui-label">Reported (dataset)</span>
        <div className="dream-cats">{reported.map((c, i) => chip(c, i, "r"))}</div>
      </div>
      <div className="cat-row">
        <span className="cat-row-label ui-label" style={{ color: "var(--cyan)" }}>Decoded (our reproduction)</span>
        <div className="dream-cats">{decoded.map((c, i) => chip(c, i, "d"))}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `cd app && npx vitest run src/features/dreams/CategoryCompare.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire into DreamPlate (comparison or fallback)**

In `app/src/features/dreams/DreamPlate.tsx`:
- import: `import { dreamAsset, hasDecoding, displayCategories, type DreamExample } from "../../lib/dreams";` and `import { CategoryCompare } from "./CategoryCompare";`
- alt line: `const alt = \`Dream "${displayCategories(dream).join(", ")}", illustrative render\`;`
- fallback tile span: `<span>{displayCategories(dream).join(" · ")}</span>`
- Replace the `showCategories && (<div className="dream-cats">…</div>)` block with:
```tsx
        {showCategories && (
          hasDecoding(dream)
            ? <CategoryCompare reported={dream.reported ?? []} decoded={dream.decoded as string[]} />
            : <div className="dream-cats">
                {(dream.categories ?? []).map((c, i) => (
                  <span key={`${dream.id}-${c}-${i}`} className="cat-chip">{c}</span>
                ))}
              </div>
        )}
```

Update `app/src/features/dreams/DreamPlate.test.tsx`: keep curated tests; add one decoded case:
```tsx
  it("shows reported vs decoded when the example is decoded", () => {
    const dec = { ...dream, reported: ["person", "street"], decoded: ["person", "car"], categories: undefined };
    render(<DreamPlate dream={dec} />);
    expect(screen.getByText(/Reported \(dataset\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Decoded \(our reproduction\)/i)).toBeInTheDocument();
  });
```

- [ ] **Step 6: Wire into Awakening (decoding phase)**

In `app/src/features/dreams/Awakening.tsx`:
- import `CategoryCompare` and `hasDecoding` from lib.
- In the `awk-decoding` block, replace the fixed `Decoded categories` label + `awk-decoding-cats` chip loop with:
```tsx
        {hasDecoding(dream) ? (
          <CategoryCompare reported={dream.reported ?? []} decoded={dream.decoded as string[]} />
        ) : (
          <>
            <span className="ui-label" style={{ color: "var(--cyan)" }}>Decoded categories</span>
            <div className="awk-decoding-cats">
              {(dream.categories ?? []).map((c, i) => (
                <span key={`${c}-${i}`} className="cat-chip" style={{ transitionDelay: `${i * 120}ms` }}>{c}</span>
              ))}
            </div>
          </>
        )}
        <p className="faint ui-label" style={{ marginTop: "0.6rem" }}>
          {metrics.pairwise_accuracy_pct}% · {metrics.note}
        </p>
```
- Truth card copy → make it accurate for decoding:
```tsx
        <p>
          <strong style={{ color: "var(--cyan)" }}>Real:</strong> the sleep fMRI + reported
          categories (Horikawa 2013). <strong style={{ color: "var(--magenta)" }}>Decoded</strong> by
          our reproduction; the image is an illustrative render, not a seen image.
        </p>
```
Update `Awakening.test.tsx`: the reduced-motion test currently asserts `/activity \+ categories/i`. Change the fixture to a decoded example and assert `/Reported \(dataset\)/i` and `/Decoded \(our reproduction\)/i` are present, `/illustrative render/i` present, `/Horikawa/i` present, and the metric `/60\s*%/` + note. Keep the timer/cleanup tests (they only check phase classes). Concretely set the fixture:
```tsx
const dream: DreamExample = {
  id: "dream-01", featured: true, subject: "Subject3",
  reported: ["person", "street"], decoded: ["person", "car"],
  report_reconstructed: "A street.", render: "renders/dream-01.webp", thumb: "thumbs/dream-01.jpg",
};
```
and in the reduced-motion assertions replace the category/`activity + categories` checks with:
```tsx
    expect(screen.getByText(/Reported \(dataset\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Decoded \(our reproduction\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/illustrative render/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Horikawa/i)).toBeInTheDocument();
```

- [ ] **Step 7: DreamsPage — use decoded for the pipeline node + metric framing**

In `app/src/features/dreams/DreamsPage.tsx`:
- import `displayCategories` from lib.
- The "Categories · real" pipeline node uses `hero.categories.join(" · ")` → change to `displayCategories(hero).join(" · ")`.
- The RenderFrame + pipeline still fine. No other required copy change (the honesty caption already says decoded/real).

- [ ] **Step 8: Add styles**

Append to `app/src/features/dreams/dreams.css`:
```css
/* Reported vs decoded comparison */
.cat-compare { display: grid; gap: 0.75rem; }
.cat-row { display: grid; gap: 0.35rem; }
.cat-row-label { color: var(--ink); }
.cat-chip.match {
  border-color: var(--cyan);
  background: color-mix(in oklch, var(--cyan) 18%, transparent);
  color: var(--ink);
}
```

- [ ] **Step 9: Full verify**

Run: `cd app && npx vitest run` → all green.
Run: `cd app && npm run build` → 0 type errors, bundle built.
Run: `cd lab && python -m pytest` → all green (gpu + data deselected).

- [ ] **Step 10: Commit**

```bash
git add app/src/features/dreams/ app/src/lib/dreams.ts
git commit -m "feat(dreams): reported-vs-decoded display (CategoryCompare) + fallback + styles"
```

---

## Manual steps (user, after implementation — documented, not run in CI)

1. `pip install bdpy` (or add to the lab env), then `cd lab && python scripts/acquire_dreams.py --inspect` — set `DREAM_URLS` from the brainliner supplement, download, read the printed metadata keys.
2. Adjust `DecodeConfig` defaults / `extract_arrays` method names in `bdpy_adapter.py` to match the installed bdpy + file (one small file).
3. `python scripts/decode_dreams.py --subject Subject3 --render` — decodes real sleep fMRI, prints measured accuracy, writes real `dreams.json` + images.
4. Commit `app/public/dreams/dreams.json` + `renders/` + `thumbs/`.
Until then, the app ships the curated Dreams data (graceful fallback), fully functional.

---

## Self-Review

**Spec coverage:** §5.1 acquire→T4; §5.2 decode(pure)→T2, adapter→T4, assembly→T3; §5.3 render→T4 note; §6 contract→T1(schema/build)+T5(app types); §7 app display + fallback→T6; §8 testing→each task (synthetic fixtures, @data/@gpu smokes); §9 manual steps→documented; §3 honesty labels→T6 tests (`Reported (dataset)`, `Decoded (our reproduction)`, `illustrative render`). ✅

**Placeholder scan:** the bdpy `DREAM_URLS`/`DecodeConfig` keys are deliberately configurable (spec-mandated isolation of the one true unknown), surfaced by the inspection step, and not required by any CI test — not placeholders. No TODO/TBD elsewhere.

**Type consistency:** `example_from_decode` (T1) consumed by `to_dream_examples` (T3); `fit_category_decoders`/`predict_scores`/`top_k`/`pairwise_identification_accuracy` (T2) consumed by decode CLI (T4); `hasDecoding`/`displayCategories`/`matchedSet` (T5) consumed by `CategoryCompare`/DreamPlate/Awakening/DreamsPage (T6); `reported`/`decoded`/`subject` fields consistent across schema (T1), python build (T1), app types (T5), components (T6). `render`/`thumb` = `renders/<id>.webp`/`thumbs/<id>.jpg` consistent (T1/T3).
