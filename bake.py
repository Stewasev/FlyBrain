"""Bake Male CNS Feather tables into data/runtime/."""
from __future__ import annotations

import argparse
from pathlib import Path

from atlas.bake import bake_from_records, copy_source_stories
from atlas.source import EDGE_NAME, load_traced_rows, topk_from_feather

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
RUNTIME = DATA / "runtime"
STORIES = ROOT / "stories"


def main() -> None:
    parser = argparse.ArgumentParser(description="Bake the Male CNS atlas runtime pack")
    parser.add_argument("--skeletons", action="store_true", help="Download SWCs for story neurons")
    args = parser.parse_args()

    print("Loading traced neurons…")
    rows = load_traced_rows(DATA)
    print(f"  {len(rows)} traced")

    print("Computing top-15 partners from significant graph…")
    traced_ids = {int(r["id"]) for r in rows}
    partner_rows, w_out, w_in = topk_from_feather(DATA / EDGE_NAME, traced_ids)
    print("  partners ready")

    stories = copy_source_stories(STORIES)
    print(f"Baking {len(stories)} stories → {RUNTIME}")
    result = bake_from_records(
        rows,
        edges=None,
        stories=stories,
        out_dir=RUNTIME,
        fetch_skeletons=args.skeletons,
        partner_rows=partner_rows,
        weight_out=w_out,
        weight_in=w_in,
    )
    print(f"Wrote {result.n} neurons ({result.n_soma} with soma)")
    for name, counts in result.story_counts.items():
        print(f"  {name}: {counts}")
    if args.skeletons:
        n_swc = len(list((RUNTIME / "skeletons").glob("*.swc"))) if (RUNTIME / "skeletons").exists() else 0
        print(f"  skeletons: {n_swc}")


if __name__ == "__main__":
    main()
