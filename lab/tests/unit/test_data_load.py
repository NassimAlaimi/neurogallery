import numpy as np
import pytest

from neurogallery.data.load import (
    SubjectData,
    assert_betas_valid,
    make_synthetic_subject,
)


def test_synthetic_subject_shapes():
    data = make_synthetic_subject(n_trials=20, n_voxels=100, n_test=5, seed=0)
    assert isinstance(data, SubjectData)
    assert data.betas.shape == (20, 100)
    assert data.image_index.shape == (20,)
    assert data.test_trial_ids.shape == (5,)


def test_synthetic_subject_is_deterministic():
    a = make_synthetic_subject(10, 50, 3, seed=42)
    b = make_synthetic_subject(10, 50, 3, seed=42)
    assert np.array_equal(a.betas, b.betas)


def test_assert_betas_valid_passes_on_expected_voxels():
    betas = np.zeros((10, 15724), dtype=np.float32)
    assert_betas_valid(betas, expected_voxels=15724)  # ne lève rien


def test_assert_betas_valid_rejects_wrong_voxel_count():
    betas = np.zeros((10, 999), dtype=np.float32)
    with pytest.raises(ValueError, match="voxels"):
        assert_betas_valid(betas, expected_voxels=15724)


def test_assert_betas_valid_rejects_non_2d():
    betas = np.zeros((10,), dtype=np.float32)
    with pytest.raises(ValueError, match="2D"):
        assert_betas_valid(betas, expected_voxels=15724)
