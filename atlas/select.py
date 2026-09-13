from __future__ import annotations

from typing import Any


def _as_list(value: Any) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _d2(a: tuple, b: tuple) -> float:
    return (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2 + (a[3] - b[3]) ** 2


def farthest_point_ids(records: list[dict], k: int) -> list[int]:
    pts = []
    for rec in records:
        if rec.get("hasSoma"):
            pts.append(
                (
                    int(rec["id"]),
                    float(rec.get("x") or 0.0),
                    float(rec.get("y") or 0.0),
                    float(rec.get("z") or 0.0),
                )
            )
    if not pts:
        return [int(r["id"]) for r in records[:k]]
    if len(pts) <= k:
        return [p[0] for p in pts]
    cx = sum(p[1] for p in pts) / len(pts)
    cy = sum(p[2] for p in pts) / len(pts)
    cz = sum(p[3] for p in pts) / len(pts)
    origin = (0, cx, cy, cz)
    first = max(pts, key=lambda p: _d2(p, origin))
    chosen = [first]
    chosen_ids = {first[0]}
    nearest = [_d2(p, first) for p in pts]
    while len(chosen) < k:
        best_i = max(
            range(len(pts)),
            key=lambda i: nearest[i] if pts[i][0] not in chosen_ids else -1.0,
        )
        nxt = pts[best_i]
        chosen.append(nxt)
        chosen_ids.add(nxt[0])
        for i, p in enumerate(pts):
            if p[0] in chosen_ids:
                nearest[i] = -1.0
            else:
                nearest[i] = min(nearest[i], _d2(p, nxt))
    return [p[0] for p in chosen]


def match_neurons(records: list[dict], select: dict) -> list[int]:
    type_prefixes = _as_list(select.get("typePrefix"))
    type_exact = set(_as_list(select.get("typeExact")))
    has_type_clause = bool(type_prefixes or type_exact)

    superclasses = set(_as_list(select.get("superclass")))
    subclasses = set(_as_list(select.get("subclass")))
    dimorphisms = set(_as_list(select.get("dimorphism")))
    fru_dsx = set(_as_list(select.get("fruDsx")))
    sample = select.get("sample")

    matched: list[dict] = []
    for rec in records:
        typ = rec.get("type") or ""
        if has_type_clause:
            ok_type = typ in type_exact or any(typ.startswith(p) for p in type_prefixes)
            if not ok_type:
                continue
        if superclasses and rec.get("superclass") not in superclasses:
            continue
        if subclasses and rec.get("subclass") not in subclasses:
            continue
        if dimorphisms and rec.get("dimorphism") not in dimorphisms:
            continue
        if fru_dsx and rec.get("fruDsx") not in fru_dsx:
            continue
        matched.append(rec)

    if sample is not None and len(matched) > int(sample):
        return farthest_point_ids(matched, int(sample))
    return sorted(int(r["id"]) for r in matched)
