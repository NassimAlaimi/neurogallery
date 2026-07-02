import json
from pathlib import Path

import pytest
from jsonschema import ValidationError

from neurogallery.build.schema import load_schema, validate_manifest

FIXTURE = Path(__file__).parent.parent / "fixtures" / "valid_manifest.json"


def test_load_schema_has_expected_top_level():
    schema = load_schema()
    assert schema["properties"].keys() >= {"build", "items"}


def test_valid_manifest_passes():
    manifest = json.loads(FIXTURE.read_text())
    validate_manifest(manifest)  # ne doit rien lever


def test_missing_gt_displayable_fails():
    manifest = json.loads(FIXTURE.read_text())
    del manifest["items"][0]["gt"]["displayable"]
    with pytest.raises(ValidationError):
        validate_manifest(manifest)


def test_unknown_method_fails():
    manifest = json.loads(FIXTURE.read_text())
    manifest["build"]["methods"] = ["not-a-method"]
    with pytest.raises(ValidationError):
        validate_manifest(manifest)
