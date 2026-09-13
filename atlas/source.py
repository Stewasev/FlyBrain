from __future__ import annotations

from pathlib import Path

from atlas.partners import PartnerRow, UINT16_MAX, _pad, _clip


ANN_NAME = "body-annotations-male-cns-v1.0-minconf-0.5.feather"
NT_NAME = "body-neurotransmitters-male-cns-v1.0.feather"
EDGE_NAME = "connectome-weights-male-cns-v1.0-minconf-0.5-significant-only.feather"


def load_traced_rows(data_dir: Path) -> list[dict]:
    import pyarrow.compute as pc
    import pyarrow.feather as feather

    ann_path = data_dir / ANN_NAME
    nt_path = data_dir / NT_NAME
    cols = [
        "bodyId",
        "type",
        "superclass",
        "class",
        "subclass",
        "somaSide",
        "somaLocation",
        "dimorphism",
        "fruDsx",
        "status",
    ]
    ann = feather.read_table(ann_path, columns=cols)
    traced = ann.filter(pc.equal(ann["status"], "Traced"))
    body_ids = traced["bodyId"].to_pylist()

    nt = feather.read_table(nt_path, columns=["body", "consensus_nt"])
    import pyarrow as pa

    nt = nt.filter(pc.is_in(nt["body"], pa.array(body_ids)))
    nt_map = dict(zip(nt["body"].to_pylist(), nt["consensus_nt"].to_pylist()))

    somas = traced["somaLocation"].to_pylist()
    types = traced["type"].to_pylist()
    superclasses = traced["superclass"].to_pylist()
    classes = traced["class"].to_pylist()
    subclasses = traced["subclass"].to_pylist()
    sides = traced["somaSide"].to_pylist()
    dimorphisms = traced["dimorphism"].to_pylist()
    fru = traced["fruDsx"].to_pylist()
    statuses = traced["status"].to_pylist()

    rows = []
    for i, body_id in enumerate(body_ids):
        soma = somas[i]
        if soma is not None:
            soma = list(soma)
        rows.append(
            {
                "id": int(body_id),
                "status": statuses[i],
                "soma": soma,
                "type": types[i],
                "superclass": superclasses[i],
                "class": classes[i],
                "subclass": subclasses[i],
                "side": sides[i],
                "nt": nt_map.get(body_id) or "",
                "dimorphism": dimorphisms[i],
                "fruDsx": fru[i],
            }
        )
    return rows


def topk_from_feather(
    edge_path: Path, traced_ids: set[int], k_in: int = 15, k_out: int = 15
) -> tuple[dict[int, PartnerRow], dict[int, int], dict[int, int]]:
    import pyarrow as pa
    import pyarrow.compute as pc
    import pyarrow.feather as feather

    t = feather.read_table(edge_path, columns=["body_pre", "body_post", "weight"])
    traced = pa.array(list(traced_ids))
    t = t.filter(pc.and_(pc.is_in(t["body_pre"], traced), pc.is_in(t["body_post"], traced)))
    grouped = t.group_by(["body_pre", "body_post"]).aggregate([("weight", "sum")])
    df = grouped.to_pandas()
    df = df.rename(columns={"weight_sum": "weight"})

    w_out = df.groupby("body_pre")["weight"].sum().to_dict()
    w_in = df.groupby("body_post")["weight"].sum().to_dict()

    out_top = (
        df.sort_values("weight", ascending=False)
        .groupby("body_pre", sort=False)
        .head(k_out)
    )
    in_top = (
        df.sort_values("weight", ascending=False)
        .groupby("body_post", sort=False)
        .head(k_in)
    )

    out_lists: dict[int, list[tuple[int, int]]] = {i: [] for i in traced_ids}
    in_lists: dict[int, list[tuple[int, int]]] = {i: [] for i in traced_ids}
    for pre, post, weight in out_top.itertuples(index=False):
        out_lists[int(pre)].append((int(post), int(weight)))
    for pre, post, weight in in_top.itertuples(index=False):
        in_lists[int(post)].append((int(pre), int(weight)))

    rows: dict[int, PartnerRow] = {}
    for body_id in traced_ids:
        o = out_lists[body_id]
        inn = in_lists[body_id]
        out_ids, out_w = _pad([p[0] for p in o], [_clip(p[1]) for p in o], k_out)
        in_ids, in_w = _pad([p[0] for p in inn], [_clip(p[1]) for p in inn], k_in)
        rows[body_id] = PartnerRow(in_id=in_ids, in_w=in_w, out_id=out_ids, out_w=out_w)
    return rows, w_out, w_in
