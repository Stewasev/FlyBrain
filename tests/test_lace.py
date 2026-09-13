from pathlib import Path

from atlas.lace import pack_lace, read_lace, swc_segments


def test_swc_segments_two_pass():
    text = "#\n1 0 0 0 0 1 -1\n3 0 2 0 0 1 2\n2 0 1 0 0 1 1\n"
    segs = swc_segments(text)
    assert len(segs) == 2
    assert segs[0] == (0.0, 0.0, 0.0, 1.0, 0.0, 0.0) or segs[1] == (0.0, 0.0, 0.0, 1.0, 0.0, 0.0)


def test_pack_lace_roundtrip(tmp_path: Path):
    skel = tmp_path / "skeletons"
    skel.mkdir()
    (skel / "11.swc").write_text(
        "# Male CNS atlas: µm, centered\n1 0 0 0 0 0.2 -1\n2 0 4 0 0 0.2 1\n",
        encoding="utf-8",
    )
    out = tmp_path / "lace.bin"
    n = pack_lace(skel, out)
    assert n == 1
    lace = read_lace(out)
    assert lace["n_segments"] == 1
    pos = lace["positions"]
    assert pos[0:3] == [0.0, 0.0, 0.0]
    assert pos[3:6] == [4.0, 0.0, 0.0]
