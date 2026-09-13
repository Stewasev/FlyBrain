from atlas.coords import apply_center, center_um, voxel_to_um


def test_voxel_to_um_uses_8nm_voxels():
    assert voxel_to_um((1000, 2000, 3000)) == (8.0, 16.0, 24.0)


def test_center_um_is_mean():
    c = center_um([(0.0, 0.0, 0.0), (10.0, 20.0, 30.0)])
    assert c == (5.0, 10.0, 15.0)


def test_apply_center_subtracts_origin():
    assert apply_center((8.0, 16.0, 24.0), (5.0, 10.0, 15.0)) == (3.0, 6.0, 9.0)
