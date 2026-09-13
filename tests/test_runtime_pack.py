from pathlib import Path

import pytest

from atlas.io_pack import read_neurons_gz, read_partners_bin

RUNTIME = Path(__file__).resolve().parents[1] / "data" / "runtime"


@pytest.mark.skipif(not (RUNTIME / "neurons.json.gz").exists(), reason="runtime pack not baked")
def test_runtime_neurons_align_with_partners():
    neurons = read_neurons_gz(RUNTIME / "neurons.json.gz")
    partners = read_partners_bin(RUNTIME / "partners.bin")
    assert neurons["n"] == partners["n"] == len(neurons["id"])
    assert neurons["id"] == partners["ids"]
    assert sum(neurons["hasSoma"]) == 140024
    assert neurons["n"] == 165122
