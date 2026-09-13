from pathlib import Path

from atlas.io_pack import read_neurons_gz, read_partners_bin, write_neurons_gz, write_partners_bin
from atlas.partners import PartnerRow


def test_partners_bin_roundtrip(tmp_path: Path):
    ids = [10, 20]
    rows = {
        10: PartnerRow(in_id=[20, 0], in_w=[4, 0], out_id=[20, 0], out_w=[9, 0]),
        20: PartnerRow(in_id=[10, 0], in_w=[9, 0], out_id=[10, 0], out_w=[4, 0]),
    }
    path = tmp_path / "partners.bin"
    write_partners_bin(path, ids, rows, k_in=2, k_out=2)
    got = read_partners_bin(path)
    assert got["n"] == 2
    assert got["k_in"] == 2
    assert got["ids"] == ids
    assert got["rows"][10].out_w == [9, 0]


def test_neurons_gz_roundtrip(tmp_path: Path):
    pack = {
        "version": 1,
        "units": "um",
        "center": [1.0, 2.0, 3.0],
        "n": 2,
        "strings": {"type": ["", "pC1_1a"]},
        "id": [10, 11],
        "x": [0.0, 1.0],
        "y": [0.0, 1.0],
        "z": [0.0, 1.0],
        "type": [1, 0],
        "hasSoma": [1, 0],
        "wOut": [9, 0],
        "wIn": [0, 9],
    }
    path = tmp_path / "neurons.json.gz"
    write_neurons_gz(path, pack)
    got = read_neurons_gz(path)
    assert got["n"] == 2
    assert got["id"] == [10, 11]
    assert got["strings"]["type"][1] == "pC1_1a"
