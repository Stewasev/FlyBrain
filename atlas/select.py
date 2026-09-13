from __future__ import annotations

from typing import Any


def _as_list(value: Any) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def match_neurons(records: list[dict], select: dict) -> list[int]:
    type_prefixes = _as_list(select.get("typePrefix"))
    type_exact = set(_as_list(select.get("typeExact")))
    has_type_clause = bool(type_prefixes or type_exact)

    superclasses = set(_as_list(select.get("superclass")))
    subclasses = set(_as_list(select.get("subclass")))
    dimorphisms = set(_as_list(select.get("dimorphism")))
    fru_dsx = set(_as_list(select.get("fruDsx")))
    sample = select.get("sample")

    matched: list[int] = []
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
        matched.append(int(rec["id"]))

    matched.sort()
    if sample is not None and len(matched) > int(sample):
        matched = matched[: int(sample)]
    return matched
