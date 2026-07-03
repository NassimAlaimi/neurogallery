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
