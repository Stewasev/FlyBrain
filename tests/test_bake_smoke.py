from pathlib import Path

from atlas.bake import bake_from_records
from atlas.io_pack import read_neurons_gz, read_partners_bin
from atlas.stories import resolve_story, skeleton_ids


def _records():
    return [
        {
            "id": 10,
            "status": "Traced",
            "soma": [1000, 2000, 3000],
            "type": "pC1_1a",
            "superclass": "cb_intrinsic",
            "class": "",
            "subclass": "",
            "side": "left",
            "nt": "acetylcholine",
            "dimorphism": "male-specific",
            "fruDsx": "fru_high",
        },
        {
            "id": 11,
            "status": "Traced",
            "soma": [1100, 2100, 3100],
            "type": "mAL_m1",
            "superclass": "cb_intrinsic",
            "class": "",
            "subclass": "",
            "side": "right",
            "nt": "gaba",
            "dimorphism": "male-specific",
            "fruDsx": "fru_high",
        },
        {
            "id": 12,
            "status": "Glia",
            "soma": [0, 0, 0],
            "type": "glia",
            "superclass": "",
            "class": "",
            "subclass": "",
            "side": "",
            "nt": "",
            "dimorphism": "",
            "fruDsx": "",
        },
        {
            "id": 13,
            "status": "Traced",
            "soma": None,
            "type": "orphan_traced",
            "superclass": "cb_intrinsic",
            "class": "",
            "subclass": "",
            "side": "",
            "nt": "unclear",
            "dimorphism": "",
            "fruDsx": "",
        },
    ]


def test_bake_writes_aligned_pack(tmp_path: Path):
    stories = [
        {
            "id": "courtship",
            "title": "Courtship",
            "steps": [
                {
                    "id": "pc1",
                    "select": {"typePrefix": ["pC1_"]},
                    "showSkeletons": True,
                }
            ],
        }
    ]
    edges = [(10, 11, 4), (11, 13, 8), (13, 10, 2)]
    result = bake_from_records(_records(), edges, stories, tmp_path)
    assert result.n == 3
    assert result.n_soma == 2
    neurons = read_neurons_gz(tmp_path / "neurons.json.gz")
    partners = read_partners_bin(tmp_path / "partners.bin")
    assert neurons["n"] == partners["n"] == 3
    assert neurons["id"] == partners["ids"] == [10, 11, 13]
    assert neurons["hasSoma"] == [1, 1, 0]
    assert (tmp_path / "stories" / "courtship.json").exists()
    resolved = resolve_story(stories[0], result.records)
    assert resolved["steps"][0]["bodyIds"] == [10]
    assert skeleton_ids([resolved], cap=400) == [10]
