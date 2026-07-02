from pathlib import Path

from neurogallery.config import LabConfig, default_config, with_overrides


def test_default_config_reads_env(monkeypatch):
    # Arrange
    monkeypatch.setenv("NEUROGALLERY_DATA_DIR", "/tmp/data")
    monkeypatch.setenv("NEUROGALLERY_ARTIFACT_ROOT", "/tmp/artifacts")

    # Act
    cfg = default_config()

    # Assert
    assert cfg.data_dir == Path("/tmp/data")
    assert cfg.artifact_root == Path("/tmp/artifacts")
    assert cfg.subject == "subj01"
    assert cfg.expected_voxels == 15724


def test_with_overrides_is_immutable():
    # Arrange
    cfg = LabConfig(data_dir=Path("/a"), artifact_root=Path("/b"))

    # Act
    updated = with_overrides(cfg, diffusion_steps=50)

    # Assert
    assert updated.diffusion_steps == 50
    assert cfg.diffusion_steps == 20  # l'original est inchangé
    assert updated is not cfg
