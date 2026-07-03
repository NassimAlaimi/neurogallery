import json
from pathlib import Path

import jsonschema
from PIL import Image

from neurogallery.dreams.build import (
    build_prompt, to_dreams_manifest, write_manifest, dream_postprocess,
)

SCHEMA = json.loads((Path(__file__).resolve().parents[3] / "dreams.schema.json").read_text())


def test_build_prompt_includes_all_categories_and_dream_aesthetic():
    prompt = build_prompt(["personne", "rue", "bâtiment"])
    for cat in ["personne", "rue", "bâtiment"]:
        assert cat in prompt
    assert "dream" in prompt.lower() or "onirique" in prompt.lower()


def test_manifest_validates_against_schema():
    manifest = to_dreams_manifest()
    jsonschema.validate(manifest, SCHEMA)


def test_manifest_has_exactly_one_featured():
    manifest = to_dreams_manifest()
    featured = [e for e in manifest["examples"] if e["featured"]]
    assert len(featured) == 1


def test_render_and_thumb_paths_derived_from_id():
    manifest = to_dreams_manifest()
    for ex in manifest["examples"]:
        assert ex["render"] == f"renders/{ex['id']}.webp"
        assert ex["thumb"] == f"thumbs/{ex['id']}.jpg"
        assert "seed" not in ex  # `seed` interne au lab, ne doit pas fuiter


def test_write_manifest_writes_valid_json(tmp_path):
    out = write_manifest(tmp_path)
    assert out == tmp_path / "dreams.json"
    data = json.loads(out.read_text(encoding="utf-8"))
    jsonschema.validate(data, SCHEMA)


def test_dream_postprocess_preserves_size_and_mode():
    src = Image.new("RGB", (64, 48), (120, 90, 200))
    out = dream_postprocess(src)
    assert out.size == (64, 48)
    assert out.mode == "RGB"


def test_dream_postprocess_preserves_non_rgb_mode():
    src = Image.new("L", (32, 24), 128)
    out = dream_postprocess(src)
    assert out.size == (32, 24)
    assert out.mode == "L"


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
