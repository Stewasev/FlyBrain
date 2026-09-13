export const VOID = 0x16130f;

export const TOKENS = {
  void: "#16130f",
  ink: "#e6dcc8",
  mute: "#8a8070",
  gold: "#e0a84a",
  teal: "#5ea8a0",
  rust: "#c45c26",
  fru: "#7dba6a",
  dsx: "#d46bb3",
  up: "#7ec8e3",
  down: "#e0a84a",
};

const SUPER = {
  ol_intrinsic: 0xe0a84a,
  ol_sensory: 0xc48a2a,
  visual_projection: 0xf0c56e,
  visual_centrifugal: 0xa67c2a,
  cb_intrinsic: 0x5ea8a0,
  cb_sensory: 0x3d7a76,
  cb_motor: 0x9fd4ce,
  cb_endocrine: 0x7eb8b2,
  descending_neuron: 0xe6dcc8,
  ascending_neuron: 0xb8c4c0,
  sensory_ascending: 0x9aa89e,
  vnc_intrinsic: 0xc45c26,
  vnc_sensory: 0xa34a1c,
  vnc_motor: 0xe07a42,
  vnc_efferent: 0x8a3c18,
  vnc_endocrine: 0xb86a40,
  vnc_tbc: 0x8a8070,
  vnc_sensory_tbc: 0x8a8070,
  sensory_descending: 0xc8c0b4,
  ENS: 0x8a8070,
};

const NT = {
  acetylcholine: 0xf0d78c,
  gaba: 0x7ec8e3,
  glutamate: 0xd07a7a,
  dopamine: 0xc4a0d8,
  serotonin: 0xe08a6a,
  octopamine: 0x8ab87a,
  histamine: 0x6aa0c4,
  unclear: 0x8a8070,
  "": 0x4a453c,
};

const DIMORPH = {
  "male-specific": 0xe8c36a,
  "sexually dimorphic": 0xc45c26,
  "potentially sexually dimorphic": 0xa67c4a,
  "potentially male-specific": 0xc4a86a,
  "": 0x3a362e,
};

const FRU = {
  fru_high: 0x7dba6a,
  fru_low: 0x4a7a42,
  dsx_high: 0xd46bb3,
  dsx_low: 0x7a3a68,
  coexpress_high: 0xe0a84a,
  coexpress_low: 0x8a7040,
  "": 0x3a362e,
};

export const MUTE_RGB = [0x3a / 255, 0x36 / 255, 0x2e / 255];

function hexToRgb(hex) {
  return [(hex >> 16) / 255, ((hex >> 8) & 0xff) / 255, (hex & 0xff) / 255];
}

function lookup(table, key, fallback = 0x4a453c) {
  if (Object.prototype.hasOwnProperty.call(table, key)) return table[key];
  return fallback;
}

export function colorFor(mode, neuron, strings) {
  if (mode === "nt") return hexToRgb(lookup(NT, strings.nt[neuron.nt] || ""));
  if (mode === "dimorphism") return hexToRgb(lookup(DIMORPH, strings.dimorphism[neuron.dimorphism] || ""));
  if (mode === "fruDsx") return hexToRgb(lookup(FRU, strings.fruDsx[neuron.fruDsx] || ""));
  return hexToRgb(lookup(SUPER, strings.superclass[neuron.superclass] || "", 0x8a8070));
}

export function legendFor(mode, strings) {
  if (mode === "nt") {
    return Object.keys(NT)
      .filter((k) => k)
      .map((k) => ({ label: k, color: `#${NT[k].toString(16).padStart(6, "0")}` }));
  }
  if (mode === "dimorphism") {
    return Object.keys(DIMORPH)
      .filter((k) => k)
      .map((k) => ({ label: k, color: `#${DIMORPH[k].toString(16).padStart(6, "0")}` }));
  }
  if (mode === "fruDsx") {
    return Object.keys(FRU)
      .filter((k) => k)
      .map((k) => ({ label: k, color: `#${FRU[k].toString(16).padStart(6, "0")}` }));
  }
  const seen = new Set(strings.superclass.filter(Boolean));
  return [...seen].sort().map((k) => ({
    label: k,
    color: `#${lookup(SUPER, k, 0x8a8070).toString(16).padStart(6, "0")}`,
  }));
}
