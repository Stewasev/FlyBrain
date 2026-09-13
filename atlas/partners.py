from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass


UINT16_MAX = 65535


@dataclass
class PartnerRow:
    in_id: list[int]
    in_w: list[int]
    out_id: list[int]
    out_w: list[int]


def _clip(weight: int) -> int:
    if weight < 0:
        return 0
    if weight > UINT16_MAX:
        return UINT16_MAX
    return int(weight)


def _pad(ids: list[int], weights: list[int], k: int) -> tuple[list[int], list[int]]:
    ids = ids[:k] + [0] * max(0, k - len(ids))
    weights = weights[:k] + [0] * max(0, k - len(weights))
    return ids, weights


def topk_partners(
    edges: list[tuple[int, int, int]],
    ids: set[int] | list[int],
    k_in: int = 15,
    k_out: int = 15,
) -> dict[int, PartnerRow]:
    traced = set(ids)
    out_map: dict[int, dict[int, int]] = defaultdict(lambda: defaultdict(int))
    in_map: dict[int, dict[int, int]] = defaultdict(lambda: defaultdict(int))
    for pre, post, weight in edges:
        if pre not in traced or post not in traced:
            continue
        w = int(weight)
        out_map[pre][post] += w
        in_map[post][pre] += w

    rows: dict[int, PartnerRow] = {}
    for body in traced:
        out_pairs = sorted(out_map[body].items(), key=lambda kv: (-kv[1], kv[0]))
        in_pairs = sorted(in_map[body].items(), key=lambda kv: (-kv[1], kv[0]))
        out_ids = [p[0] for p in out_pairs[:k_out]]
        out_ws = [_clip(p[1]) for p in out_pairs[:k_out]]
        in_ids = [p[0] for p in in_pairs[:k_in]]
        in_ws = [_clip(p[1]) for p in in_pairs[:k_in]]
        out_ids, out_ws = _pad(out_ids, out_ws, k_out)
        in_ids, in_ws = _pad(in_ids, in_ws, k_in)
        rows[body] = PartnerRow(in_id=in_ids, in_w=in_ws, out_id=out_ids, out_w=out_ws)
    return rows
