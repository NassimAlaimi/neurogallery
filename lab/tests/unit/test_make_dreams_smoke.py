import importlib.util
from pathlib import Path

import pytest

# Le script n'est pas un package : on le charge par chemin (pas d'import 'scripts.*').
_SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "make_dreams.py"


def _load_make_dreams():
    spec = importlib.util.spec_from_file_location("make_dreams", _SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_script_exposes_expected_api():
    md = _load_make_dreams()
    assert callable(md.render_images)
    assert callable(md.main)


@pytest.mark.gpu
def test_render_images_produces_assets(tmp_path):
    md = _load_make_dreams()
    md.render_images(tmp_path)
    ids = [e["id"] for e in md.examples.EXAMPLES]
    for i in ids:
        assert (tmp_path / "renders" / f"{i}.webp").exists()
        assert (tmp_path / "thumbs" / f"{i}.jpg").exists()
