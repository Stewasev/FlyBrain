from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from atlas.coords import apply_center, center_um, voxel_to_um
from atlas.intern import InternTable
from atlas.io_pack import write_neurons_gz, write_partners_bin
from atlas.partners import topk_partners
from atlas.lace import pack_lace
from atlas.skeletons import download_many
from atlas.stories import resolve_story, skeleton_ids

K_IN = 15
K_OUT = 15


@dataclass
class BakeResult:
    n: int
    n_soma: int
    records: list[dict] = field(default_factory=list)
    center: tuple[float, float, float] = (0.0, 0.0, 0.0)
    story_counts: dict[str, list[int]] = field(default_factory=dict)


def _valid_soma(soma) -> bool:
    return isinstance(soma, (list, tuple)) and len(soma) == 3 and soma[0] is not None


def bake_from_records(
    rows: list[dict],
    edges: list[tuple[int, int, int]] | None,
    stories: list[dict],
    out_dir: Path,
    fetch_skeletons: bool = False,
    partner_rows: dict | None = None,
    weight_out: dict[int, int] | None = None,
    weight_in: dict[int, int] | None = None,
) -> BakeResult:
    traced = [r for r in rows if r.get("status") == "Traced"]
    traced.sort(key=lambda r: int(r["id"]))
    ids = [int(r["id"]) for r in traced]
    id_set = set(ids)

    soma_um: list[tuple[float, float, float]] = []
    for r in traced:
        if _valid_soma(r.get("soma")):
            soma_um.append(voxel_to_um(r["soma"]))
    center = center_um(soma_um)

    tables = {
        "superclass": InternTable(),
        "type": InternTable(),
        "class": InternTable(),
        "subclass": InternTable(),
        "side": InternTable(),
        "nt": InternTable(),
        "dimorphism": InternTable(),
        "fruDsx": InternTable(),
    }

    xs, ys, zs = [], [], []
    has_soma = []
    fields = {k: [] for k in tables}
    records: list[dict] = []

    for r in traced:
        body_id = int(r["id"])
        if _valid_soma(r.get("soma")):
            um = apply_center(voxel_to_um(r["soma"]), center)
            has_soma.append(1)
        else:
            um = (0.0, 0.0, 0.0)
            has_soma.append(0)
        xs.append(round(um[0], 4))
        ys.append(round(um[1], 4))
        zs.append(round(um[2], 4))
        rec = {
            "id": body_id,
            "type": r.get("type") or "",
            "superclass": r.get("superclass") or "",
            "class": r.get("class") or "",
            "subclass": r.get("subclass") or "",
            "side": r.get("side") or "",
            "nt": r.get("nt") or "",
            "dimorphism": r.get("dimorphism") or "",
            "fruDsx": r.get("fruDsx") or "",
            "hasSoma": has_soma[-1],
            "x": xs[-1],
            "y": ys[-1],
            "z": zs[-1],
        }
        records.append(rec)
        for key, table in tables.items():
            fields[key].append(table.intern(rec[key]))

    if partner_rows is None:
        partner_rows = topk_partners(edges or [], id_set, k_in=K_IN, k_out=K_OUT)
    if weight_out is None or weight_in is None:
        w_out = {i: 0 for i in ids}
        w_in = {i: 0 for i in ids}
        for pre, post, weight in edges or []:
            if pre in id_set and post in id_set:
                w_out[pre] += int(weight)
                w_in[post] += int(weight)
    else:
        w_out = {i: int(weight_out.get(i, 0)) for i in ids}
        w_in = {i: int(weight_in.get(i, 0)) for i in ids}

    pack = {
        "version": 1,
        "units": "um",
        "center": [round(center[0], 4), round(center[1], 4), round(center[2], 4)],
        "n": len(ids),
        "kIn": K_IN,
        "kOut": K_OUT,
        "strings": {k: t.strings for k, t in tables.items()},
        "id": ids,
        "x": xs,
        "y": ys,
        "z": zs,
        "hasSoma": has_soma,
        "wOut": [w_out[i] for i in ids],
        "wIn": [w_in[i] for i in ids],
    }
    pack.update(fields)

    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    write_neurons_gz(out_dir / "neurons.json.gz", pack)
    write_partners_bin(out_dir / "partners.bin", ids, partner_rows, k_in=K_IN, k_out=K_OUT)

    story_dir = out_dir / "stories"
    story_dir.mkdir(exist_ok=True)
    resolved_all = []
    story_counts: dict[str, list[int]] = {}
    for story in stories:
        resolved = resolve_story(story, records)
        resolved_all.append(resolved)
        story_counts[resolved["id"]] = [len(s.get("bodyIds") or []) for s in resolved["steps"]]
        (story_dir / f"{resolved['id']}.json").write_text(
            json.dumps(resolved, indent=2), encoding="utf-8"
        )

    if fetch_skeletons:
        skel_dir = out_dir / "skeletons"
        skel_ids = skeleton_ids(resolved_all, cap=400)
        n_ok = download_many(skel_ids, skel_dir, center)
        print(f"  downloaded {n_ok}/{len(skel_ids)} skeletons")
        n_lace = pack_lace(skel_dir, out_dir / "lace.bin")
        print(f"  lace from {n_lace} skeletons")

    return BakeResult(
        n=len(ids),
        n_soma=sum(has_soma),
        records=records,
        center=center,
        story_counts=story_counts,
    )


def copy_source_stories(src: Path) -> list[dict]:
    stories = []
    for path in sorted(src.glob("*.json")):
        stories.append(json.loads(path.read_text(encoding="utf-8")))
    return stories
