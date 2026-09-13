from atlas.select import match_neurons
from atlas.skeletons import convert_swc_text
from atlas.stories import resolve_story, skeleton_ids


def test_resolve_story_adds_body_ids():
    records = [
        {"id": 5, "type": "T4a", "superclass": "ol_intrinsic", "subclass": "", "dimorphism": "", "fruDsx": ""},
        {"id": 6, "type": "T5b", "superclass": "ol_intrinsic", "subclass": "", "dimorphism": "", "fruDsx": ""},
        {"id": 7, "type": "LC4", "superclass": "visual_projection", "subclass": "", "dimorphism": "", "fruDsx": ""},
    ]
    story = {
        "id": "vision",
        "steps": [
            {"id": "motion", "select": {"typePrefix": ["T4", "T5"], "sample": 1}, "showSkeletons": True},
            {"id": "vpn", "select": {"typeExact": ["LC4"]}, "showSkeletons": True},
        ],
    }
    resolved = resolve_story(story, records)
    assert resolved["steps"][0]["bodyIds"] == [5]
    assert resolved["steps"][1]["bodyIds"] == [7]
    assert resolved["steps"][0]["skeletonIds"] == [5]
    assert skeleton_ids([resolved], cap=400) == [5, 7]


def test_skeleton_sample_spreads_subset():
    records = [
        {
            "id": i,
            "type": "x",
            "superclass": "cb_intrinsic",
            "subclass": "",
            "dimorphism": "male-specific",
            "fruDsx": "",
            "hasSoma": 1,
            "x": float(i),
            "y": 0.0,
            "z": 0.0,
        }
        for i in range(20)
    ]
    story = {
        "id": "dimorphism",
        "steps": [
            {
                "id": "male",
                "select": {"dimorphism": ["male-specific"]},
                "showSkeletons": True,
                "skeletonSample": 4,
            }
        ],
    }
    resolved = resolve_story(story, records)
    assert len(resolved["steps"][0]["bodyIds"]) == 20
    skel = resolved["steps"][0]["skeletonIds"]
    assert len(skel) == 4
    assert set(skel) <= set(resolved["steps"][0]["bodyIds"])
    assert skeleton_ids([resolved], cap=400) == skel


def test_stain_only_step_has_no_body_ids():
    records = [
        {"id": 1, "type": "pC1_1a", "superclass": "cb_intrinsic", "subclass": "", "dimorphism": "male-specific", "fruDsx": "fru_high"},
    ]
    story = {
        "id": "dimorphism",
        "steps": [{"id": "wash", "select": {"stainOnly": True}, "showSkeletons": False}],
    }
    resolved = resolve_story(story, records)
    assert resolved["steps"][0]["bodyIds"] == []
    assert resolved["steps"][0]["stainOnly"] is True
    assert skeleton_ids([resolved], cap=400) == []


def test_skeleton_cap_drops_from_largest_step():
    story = {
        "id": "x",
        "steps": [
            {"id": "a", "bodyIds": [1, 2, 3, 4], "showSkeletons": True},
            {"id": "b", "bodyIds": [10, 11], "showSkeletons": True},
        ],
    }
    assert skeleton_ids([story], cap=3) == [1, 10, 2]


def test_swc_converts_8nm_and_centers():
    text = "# comment\n1 0 1000 0 0 10 -1\n2 0 2000 0 0 10 1\n"
    out = convert_swc_text(text, center=(4.0, 0.0, 0.0))
    lines = [ln for ln in out.splitlines() if not ln.startswith("#") and ln.strip()]
    n1 = lines[0].split()
    assert float(n1[2]) == 4.0
    assert float(n1[5]) == 0.08
