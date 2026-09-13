from __future__ import annotations

import copy

from atlas.select import farthest_point_ids, match_neurons


def resolve_story(story: dict, records: list[dict]) -> dict:
    out = copy.deepcopy(story)
    by_id = {int(r["id"]): r for r in records}
    for step in out.get("steps", []):
        select = step.get("select")
        if not select or select.get("stainOnly"):
            step["bodyIds"] = []
            step["skeletonIds"] = []
            step["stainOnly"] = True
            continue
        step["bodyIds"] = match_neurons(records, select)
        step["stainOnly"] = False
        skel_n = step.get("skeletonSample")
        if step.get("showSkeletons") and skel_n:
            subset = [by_id[i] for i in step["bodyIds"] if i in by_id]
            step["skeletonIds"] = farthest_point_ids(subset, int(skel_n))
        elif step.get("showSkeletons"):
            step["skeletonIds"] = list(step["bodyIds"])
        else:
            step["skeletonIds"] = []
    return out


def skeleton_ids(stories: list[dict], cap: int = 400) -> list[int]:
    steps = []
    for story in stories:
        for step in story.get("steps", []):
            if not step.get("showSkeletons"):
                continue
            ids = list(step.get("skeletonIds") or step.get("bodyIds") or [])
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
