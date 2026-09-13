from atlas.intern import InternTable


def test_none_and_empty_share_index_zero():
    table = InternTable()
    assert table.intern(None) == 0
    assert table.intern("") == 0
    assert table.strings[0] == ""


def test_interns_stable_ids():
    table = InternTable()
    a = table.intern("cb_intrinsic")
    b = table.intern("vnc_intrinsic")
    assert a != b
    assert table.intern("cb_intrinsic") == a
    assert table.strings[a] == "cb_intrinsic"
    assert table.strings[b] == "vnc_intrinsic"
