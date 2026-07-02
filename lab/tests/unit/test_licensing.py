from neurogallery.licensing.resolve import (
    GtLicense,
    resolve_gt_license,
    DISPLAYABLE_LICENSE_IDS,
)

INDEX = {
    100: {"license_id": 4, "flickr_url": "https://flickr.com/a"},   # CC BY -> displayable + attribution
    200: {"license_id": 7, "flickr_url": "https://flickr.com/b"},   # no known restrictions -> displayable, pas d'attribution requise
    300: {"license_id": 2, "flickr_url": "https://flickr.com/c"},   # CC BY-NC -> non affichable
    400: {"license_id": 99, "flickr_url": None},                    # inconnu -> non affichable
}


def test_cc_by_is_displayable_with_attribution():
    lic = resolve_gt_license(100, INDEX)
    assert lic.displayable is True
    assert lic.license_id == 4
    assert lic.license_name == "CC BY 2.0"
    assert lic.attribution is not None
    assert lic.source_url == "https://flickr.com/a"


def test_no_known_restrictions_displayable_without_attribution():
    lic = resolve_gt_license(200, INDEX)
    assert lic.displayable is True
    assert lic.attribution is None


def test_noncommercial_not_displayable():
    lic = resolve_gt_license(300, INDEX)
    assert lic.displayable is False
    assert lic.attribution is None


def test_unknown_license_not_displayable():
    lic = resolve_gt_license(400, INDEX)
    assert lic.displayable is False
    assert lic.license_name == "Unknown"


def test_missing_coco_id_is_not_displayable():
    lic = resolve_gt_license(999, INDEX)
    assert lic.displayable is False


def test_displayable_ids_constant():
    assert DISPLAYABLE_LICENSE_IDS == frozenset({4, 5, 7, 8})
