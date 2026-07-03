# NeuroGallery — Plan 4 : Real Dream Decoding (Design Spec)

**Date:** 2026-07-03
**Status:** Validated in brainstorming; proceeding straight to plan + implementation per user request.
**Scope:** One coherent subproject: a Python reproduction of Horikawa 2013 **category-level** dream decoding on real sleep fMRI, feeding **reported-vs-decoded** results into the existing Dreams tab. Ambition level **A** (category decoding). Image reconstruction from sleep betas (B) is explicitly out of scope.

---

## 1. Goal

Replace the Dreams tab's *curated* categories with **genuinely decoded** results: for real sleep-onset awakenings from the public Kamitani dataset, train a decoder on the subject's **awake** perception patterns, predict categories from the **real sleep fMRI**, and show, per awakening, the dreamer's **reported** categories (dataset ground truth) next to our decoder's **decoded** categories, with the real measured accuracy.

## 2. Feasibility & data (established during brainstorming)

- Data is public (Horikawa et al., *Science*, 2013). Preprocessed data is in **bdpy format** (BrainDecoderToolbox2) and loads in **pure Python** via the official `bdpy` package (`pip install bdpy`) — no MATLAB.
- Source: brainliner (`http://brainliner.jp/data/brainliner/Human_Dream_Decoding`) — the **preprocessed** file(s) from the paper's supplement, not the >30 GB raw. Exact URL/size confirmed in the first implementation task.
- Per subject the bdpy dataset contains: **awake perception** samples (training), **sleep-onset** samples, category **labels** (WordNet synsets), all in visual-ROI voxel space.
- Decoding is **category-level** — the robust, reproducible result. There is **no ground-truth image** of a dream.
- 3 subjects, ~200 awakenings each; 9 s (3 volumes) window before waking.

**References:** Horikawa 2013 (https://www.science.org/doi/10.1126/science.1234330) · KamitaniLab/HumanDreamDecoding · KamitaniLab/bdpy · PMC5281549.

## 3. Honesty contract (updates the Dreams contract; non-negotiable)

**Real & sourced:**
- The sleep fMRI and the **reported** categories = the dataset (Horikawa 2013).
- The **decoded** categories = output of **our reproduction** of the 2013 method, run on the real sleep fMRI. Always labelled as *our reproduction* (not "the paper's decoder").
- `pairwise_accuracy_pct` = the value **we actually measured** on the sleep set (may differ from the paper). Never a fabricated number.

**Ours / illustrative:**
- The rendered image = our illustrative render of the **decoded** categories; always labelled "illustrative render". Never "seen image" / "real dream".

**Interdits:**
- No cherry-picking only perfect hits — show honest overlap (reported ∩ decoded), including partial matches and misses.
- No claim of image-level dream reconstruction.
- If the real decode has not been run, the tab must NOT present curated data as "decoded" (see §7 graceful fallback).

## 4. Architecture

Two halves, matching the project:

- **Lab (offline, user's machine):** acquire bdpy data → decode (sklearn) → render decoded categories (existing `make_dreams` text→image) → write the app data contract. The pure logic is testable with **synthetic fixtures**; the real bdpy load + full decode is a `@pytest.mark.data`/`@pytest.mark.gpu` smoke the user runs.
- **App (web):** extend the Dreams data contract + Dreams tab to display **reported vs decoded** per awakening, with graceful fallback to the current curated display when decoded data is absent.

## 5. Lab

### 5.1 Acquire — `scripts/acquire_dreams.py`
Downloads the preprocessed bdpy file(s) into `~/neurogallery-data/dream/` and prints an **inspection summary** (available ROIs, label column name, the design column that separates perception vs sleep, voxel counts, sample counts). This inspection output is what pins the dataset-specific keys used by the adapter (§5.2). GPU not required.

### 5.2 Decode — `neurogallery/dreams/decode.py` (pure/testable) + `scripts/decode_dreams.py` (CLI)

**Adapter (thin, dataset-specific, isolated):**
- `extract_arrays(bdata, cfg) -> DecodeInputs` where `cfg` names the ROI(s), label column, and perception/sleep split values (filled from the §5.1 inspection). Returns standardized arrays:
  `X_perc [n_perc, n_vox]`, `Y_perc [n_perc, n_cat]` (multi-hot category presence), `X_sleep [n_sleep, n_vox]`, `Y_sleep [n_sleep, n_cat]` (reported categories multi-hot), `category_names [n_cat]`.

**Decoder (pure, sklearn — reproduction of the 2013 approach):**
- `fit_category_decoders(X_perc, Y_perc) -> Decoders` : one L2-regularized `LogisticRegression` per category (binary present/absent) on standardized awake voxel patterns (a faithful, simpler stand-in for the paper's sparse logistic regression).
- `predict_scores(decoders, X_sleep) -> S [n_sleep, n_cat]` : per-category decision scores.
- `top_k(scores_row, category_names, k) -> list[str]` : decoded categories for one awakening.

**Evaluation (pure):**
- `pairwise_identification_accuracy(S, Y_sleep, rng_seed) -> float` : the paper's metric — for each sleep sample, is the decoded score vector more consistent with its own reported label than with a randomly paired other sample's label? Returns accuracy in [0,1] (chance = 0.5). Deterministic given `rng_seed`.

**Contract assembly (pure):**
- `to_dream_examples(selected, category_names, S, Y_sleep, k) -> list[dict]` : for each selected sleep-sample index, build `{id, subject, reported:[...], decoded:[...], render, thumb, seed}` where `reported` = that sample's true categories, `decoded` = top-k. Selection = a small representative set (default 3: 1 featured + 2), chosen deterministically (e.g. by sample index), NOT filtered to only good hits.

**CLI `decode_dreams.py`:** load bdpy (adapter) → fit → predict → eval → assemble examples → write `dreams.json` (via the existing build, extended) with `study_metrics.pairwise_accuracy_pct` = the measured accuracy. `--json-only` writes JSON without rendering; full run also renders decoded-category images via `make_dreams`'s render step.

### 5.3 Render
Reuse `make_dreams.render_images`, but prompts are built from the **decoded** categories of each example (so the image reflects what was decoded). Same public-model, `token=False` setup as today.

## 6. Data contract (`dreams.json` + `dreams.schema.json`)

Extend the example object (all additive / backward-compatible):
```json
{
  "id": "dream-01",
  "featured": true,
  "subject": "Subject3",
  "reported": ["person", "street"],
  "decoded": ["person", "car", "street"],
  "report_reconstructed": "A street with a figure.",
  "render": "renders/dream-01.webp",
  "thumb": "thumbs/dream-01.jpg"
}
```
- `reported` and `decoded` are **optional** arrays of non-empty strings; `subject` optional string.
- Back-compat: the existing `categories` (curated) stays valid; an example has EITHER the curated `categories` OR the real `reported`+`decoded` pair.
- `study_metrics.pairwise_accuracy_pct` = measured value; `study_metrics.note` explains it's our reproduction's pairwise accuracy on the sleep set (chance 50%).
- `study.decoder` (optional string): "our reproduction of Horikawa 2013 (per-category logistic regression)".
- Schema + `validateDreams` updated: accept optional `reported`/`decoded`/`subject`/`study.decoder`; when `decoded` present it must be non-empty; keep `categories` optional. Exactly one `featured`.

## 7. App integration

**`DreamPlate` / `Awakening` / `DreamsPage`:** when an example has `reported`+`decoded`, render the **comparison**:
- Two labelled rows: **Reported** (dataset ground truth) and **Decoded** (our decoder), each as chips.
- Overlap highlight: categories present in both get a "match" style; decoded-only and reported-only are visually distinct.
- The metric line shows the real `pairwise_accuracy_pct` framed as our reproduction's measured accuracy.
- The image (illustrative render of decoded) keeps its "illustrative render" badge.

**Graceful fallback:** when an example has only curated `categories` (no `decoded`), render exactly today's single-list behavior. This lets the committed app work before the real decode is run.

**Honesty labels (tested in DOM):** "Reported (dataset)", "Decoded (our reproduction, from sleep fMRI)", "illustrative render". Never "seen image"/"real dream".

## 8. Testing

- **Lab (pytest, synthetic fixtures — no real data):**
  - `fit_category_decoders`/`predict_scores`/`top_k`: on a synthetic dataset where a category is linearly separable, the decoder recovers it (accuracy high); top_k returns the planted categories.
  - `pairwise_identification_accuracy`: on synthetic perfectly-decoded data → 1.0; on random → ~0.5; deterministic with seed.
  - `to_dream_examples`: shape/fields correct, reported/decoded populated, render/thumb derived from id, `seed` not leaked, exactly one featured.
  - `extract_arrays`: tested against a small **synthetic bdpy-like** object (or a stub) to verify ROI/label/split selection logic; the real bdpy load is a `@pytest.mark.data` smoke.
  - Contract output validates against `dreams.schema.json`.
- **App (Vitest):**
  - `validateDreams`: accepts reported/decoded/subject; rejects empty `decoded`; back-compat curated example still valid.
  - Comparison display: reported + decoded chips render, overlap highlighted, honesty labels present; fallback path renders curated single list.
- Coverage ≥ 80% on new pure logic.

## 9. Manual steps (user, documented)

1. `python scripts/acquire_dreams.py` → downloads bdpy data, prints inspection summary.
2. Fill the small adapter `cfg` (ROI/label/split keys) from the summary (documented).
3. `python scripts/decode_dreams.py` → decodes, prints measured accuracy, writes real `dreams.json` (+ renders on full run).
4. Commit the resulting `dreams.json` + images.

Until these run, the app ships the current curated Dreams data (graceful fallback), fully functional.

## 10. Out of scope

- **B — image reconstruction from sleep betas** (MindEye-style). Documented stretch, separate spec.
- Multi-subject dashboards, statistical significance testing beyond the single pairwise-accuracy number.
- No changes to the NSD gallery pipeline or manifest.

## 11. Risks & parades

- **Preprocessed bdpy availability/URL:** confirmed in task 1 (WebFetch brainliner). Fallback: raw set (heavier) or contact brainliner-admin@atr.jp. Flagged, non-blocking for the code (synthetic-fixture tests don't need it).
- **bdpy dataset-specific keys** (ROI/label/split names): unknown until the file is inspected → isolated to the `cfg` + `extract_arrays` adapter; the inspection step (§5.1) surfaces them; pure logic + app are fully specified regardless.
- **Reproduction accuracy** may differ from the paper: we report our measured number honestly (that's the point).
- **Honesty drift:** all labels asserted in DOM tests.

## Sources
- [Horikawa et al. 2013, *Science*](https://www.science.org/doi/10.1126/science.1234330)
- [KamitaniLab/HumanDreamDecoding](https://github.com/KamitaniLab/HumanDreamDecoding)
- [KamitaniLab/bdpy (Python loader)](https://github.com/KamitaniLab/bdpy)
- [Hierarchical Neural Representation of Dreamed Objects (PMC5281549)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5281549/)
