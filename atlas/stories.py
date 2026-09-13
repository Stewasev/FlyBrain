from __future__ import annotations

import copy

from atlas.select import match_neurons


def resolve_story(story: dict, records: list[dict]) -> dict:
    out = copy.deepcopy(story)
    for step in out.get("steps", []):
        select = step.get("select") or {}
        step["bodyIds"] = match_neurons(records, select)
    return out


def skeleton_ids(stories: list[dict], cap: int = 400) -> list[int]:
    steps = []
    for story in stories:
        for step in story.get("steps", []):
            if not step.get("showSkeletons"):
                continue
            ids = list(step.get("bodyIds") or [])
            if ids:
                steps.append(ids)
    chosen: list[int] = []
    seen: set[int] = set()

    def add(seq: list[int]) -> None:
        for body_id in seq:
            if body_id in seen:
                continue
            if len(chosen) >= cap:
                return
            seen.add(body_id)
            chosen.append(body_id)

    for ids in steps:
        add(ids[:1])
    remaining = cap - len(chosen)
    if remaining <= 0:
        return chosen
    extras = [ids[1:] for ids in steps]
    while remaining > 0 and any(extras):
        largest = max(range(len(extras)), key=lambda i: len(extras[i]))
        if not extras[largest]:
            break
        nxt = extras[largest].pop(0)
        if nxt in seen:
            continue
        seen.add(nxt)
        chosen.append(nxt)
        remaining -= 1
    return chosen
