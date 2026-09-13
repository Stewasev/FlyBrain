from atlas.select import match_neurons

RECORDS = [
    {"id": 10, "type": "pC1_1a", "superclass": "cb_intrinsic", "subclass": "", "dimorphism": "male-specific", "fruDsx": "fru_high"},
    {"id": 11, "type": "LPC1", "superclass": "visual_projection", "subclass": "", "dimorphism": "", "fruDsx": ""},
    {"id": 12, "type": "LLPC1", "superclass": "visual_projection", "subclass": "", "dimorphism": "", "fruDsx": ""},
    {"id": 13, "type": "pC1_16b", "superclass": "cb_intrinsic", "subclass": "", "dimorphism": "male-specific", "fruDsx": "fru_high"},
    {"id": 14, "type": "mAL_m1", "superclass": "cb_intrinsic", "subclass": "", "dimorphism": "male-specific", "fruDsx": "fru_high"},
    {"id": 20, "type": "Ti flexor MN", "superclass": "vnc_motor", "subclass": "leg", "dimorphism": "", "fruDsx": ""},
    {"id": 21, "type": "Ti extensor MN", "superclass": "vnc_motor", "subclass": "leg", "dimorphism": "", "fruDsx": ""},
    {"id": 22, "type": "T4a", "superclass": "ol_intrinsic", "subclass": "", "dimorphism": "", "fruDsx": ""},
]


def test_pc1_prefix_does_not_match_lpc1():
    ids = match_neurons(RECORDS, {"typePrefix": ["pC1_"]})
    assert ids == [10, 13]


def test_type_exact_or_prefix():
    ids = match_neurons(RECORDS, {"typeExact": ["Ti flexor MN"], "typePrefix": ["mAL"]})
    assert ids == [14, 20]


def test_sample_keeps_lowest_ids():
    ids = match_neurons(RECORDS, {"typePrefix": ["T4", "pC1_"], "sample": 2})
    assert ids == [10, 13]


def test_subclass_filter():
    ids = match_neurons(RECORDS, {"subclass": ["leg"]})
    assert ids == [20, 21]
