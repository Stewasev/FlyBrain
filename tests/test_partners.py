from atlas.partners import topk_partners


def test_topk_in_and_out_on_toy_graph():
    ids = [1, 2, 3]
    edges = [
        (1, 2, 10),
        (1, 3, 5),
        (1, 3, 1),
        (2, 3, 40),
        (3, 1, 7),
        (9, 1, 100),
    ]
    rows = topk_partners(edges, ids, k_in=2, k_out=2)
    assert rows[1].out_id == [2, 3]
    assert rows[1].out_w == [10, 6]
    assert rows[1].in_id == [3, 0]
    assert rows[1].in_w == [7, 0]
    assert rows[3].in_id == [2, 1]
    assert rows[3].in_w == [40, 6]


def test_weight_clips_to_uint16():
    rows = topk_partners([(1, 2, 80_000)], {1, 2}, k_in=1, k_out=1)
    assert rows[1].out_w == [65535]
