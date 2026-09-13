export const LIVE_MODES = [
  {
    id: "drift",
    title: "Drift",
    narration: "A wave crawls the length of the CNS. Simulated — not a recording.",
    bands: 3,
  },
  {
    id: "vision",
    title: "Vision",
    narration: "Motion detectors fire, then feature VPNs, then the brain.",
    groups: [{ prefix: ["T4", "T5"] }, { prefix: ["LC10", "LC4", "LPLC"] }, { prefix: ["LC6", "LC11"] }],
  },
  {
    id: "courtship",
    title: "Courtship",
    narration: "P1 commands, mAL, descending song cells, then VNC motor.",
    groups: [
      { prefix: ["pC1_"] },
      { prefix: ["mAL"] },
      { exact: ["pIP10", "aSP22", "DNp13"] },
      { exact: ["vPR6"], prefix: ["TN1c_"] },
    ],
  },
  {
    id: "walk",
    title: "Walk",
    narration: "Descending drive, then left motors, then right. A fake step.",
    groups: [
      { prefix: ["DNg"], exact: ["MDN"] },
      { exact: ["Ti flexor MN", "Tr flexor MN"], side: "left" },
      { exact: ["Ti extensor MN", "Tr extensor MN"], side: "left" },
      { exact: ["Ti flexor MN", "Tr flexor MN"], side: "right" },
      { exact: ["Ti extensor MN", "Tr extensor MN"], side: "right" },
    ],
  },
];

const K = 15;

function typeOf(n, strings) {
  return strings.type[n.type] || "";
}

function sideOf(n, strings) {
  return (strings.side && strings.side[n.side]) || "";
}

function matches(n, strings, spec) {
  if (!n.hasSoma) return false;
  if (spec.side && sideOf(n, strings) !== spec.side) return false;
  const t = typeOf(n, strings);
  if (spec.exact && spec.exact.includes(t)) return true;
  if (spec.prefix && spec.prefix.some((p) => t.startsWith(p))) return true;
  return false;
}

export function collectSeeds(neurons, strings, mode) {
  const spec = LIVE_MODES.find((m) => m.id === mode) || LIVE_MODES[0];
  if (spec.groups) {
    const ids = [];
    for (const g of spec.groups) {
      for (const n of neurons) if (matches(n, strings, g)) ids.push(n.id);
    }
    return ids;
  }
  return neurons.filter((n) => n.hasSoma).map((n) => n.id);
}

function toIndices(ids, idToI) {
  const out = [];
  for (const id of ids) {
    const i = idToI.get(id);
    if (i != null) out.push(i);
  }
  return out;
}

export function createSim(soma, partners) {
  const n = soma.length;
  const idToI = new Map();
  for (let i = 0; i < n; i++) idToI.set(soma[i].id, i);
  const outI = new Int32Array(n * K);
  outI.fill(-1);
  const outW = new Float32Array(n * K);
  for (let i = 0; i < n; i++) {
    const row = partners.rows.get(soma[i].id);
    if (!row) continue;
    const base = i * K;
    for (let k = 0; k < K; k++) {
      const pid = row.outId[k];
      if (!pid) continue;
      const j = idToI.get(pid);
      if (j == null) continue;
      outI[base + k] = j;
      outW[base + k] = row.outW[k] || 1;
    }
  }
  return {
    n,
    soma,
    energy: new Float32Array(n),
    next: new Float32Array(n),
    outI,
    outW,
    idToI,
    injectAt: 0,
    mode: "drift",
    seeds: [],
    groups: [],
    groupI: 0,
  };
}

function zBands(soma, bands) {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < soma.length; i++) {
    const z = Number.isFinite(soma[i].z) ? soma[i].z : 0;
    if (z < lo) lo = z;
    if (z > hi) hi = z;
  }
  const groups = Array.from({ length: bands }, () => []);
  const span = hi - lo || 1;
  for (let i = 0; i < soma.length; i++) {
    const z = Number.isFinite(soma[i].z) ? soma[i].z : 0;
    let b = Math.floor(((z - lo) / span) * bands);
    if (b >= bands) b = bands - 1;
    if (b < 0) b = 0;
    groups[b].push(i);
  }
  return groups;
}

export function setSimMode(sim, neurons, strings, mode) {
  sim.mode = mode;
  sim.groupI = 0;
  const spec = LIVE_MODES.find((m) => m.id === mode) || LIVE_MODES[0];
  if (spec.groups) {
    sim.groups = spec.groups.map((g) => {
      const ids = [];
      for (const n of neurons) if (matches(n, strings, g)) ids.push(n.id);
      return toIndices(ids, sim.idToI);
    }).filter((g) => g.length);
  } else if (spec.bands) {
    sim.groups = zBands(sim.soma, spec.bands).filter((g) => g.length);
  } else {
    sim.groups = [Array.from({ length: Math.min(500, sim.n) }, (_, k) => (k * 9973) % sim.n)];
  }
  sim.seeds = sim.groups.flat();
  if (!sim.seeds.length) {
    sim.groups = [Array.from({ length: Math.min(400, sim.n) }, (_, k) => (k * 9973) % sim.n)];
    sim.seeds = sim.groups[0];
  }
}

export function stepSim(sim, now) {
  const { n, energy, next, outI, outW } = sim;
  for (let i = 0; i < n; i++) next[i] = energy[i] * 0.9;
  for (let i = 0; i < n; i++) {
    const e = energy[i];
    if (e < 0.05) continue;
    const base = i * K;
    let wsum = 0;
    for (let k = 0; k < K; k++) if (outI[base + k] >= 0) wsum += outW[base + k];
    if (wsum <= 0) continue;
    const send = e * 0.78;
    for (let k = 0; k < K; k++) {
      const j = outI[base + k];
      if (j < 0) continue;
      next[j] += send * (outW[base + k] / wsum);
    }
  }
  if (now - sim.injectAt > 180) {
    sim.injectAt = now;
    const group = sim.groups[sim.groupI % sim.groups.length] || sim.seeds;
    sim.groupI += 1;
    const burst = Math.min(group.length, 40 + Math.floor(Math.random() * 40));
    for (let b = 0; b < burst; b++) {
      next[group[Math.floor(Math.random() * group.length)]] = 1;
    }
  }
  for (let i = 0; i < n; i++) energy[i] = next[i] > 1 ? 1 : next[i];
  return energy;
}

export function activityFocus(soma, energy, min = 0.16) {
  let w = 0;
  let x = 0;
  let y = 0;
  let z = 0;
  let count = 0;
  for (let i = 0; i < energy.length; i++) {
    const e = energy[i];
    if (e < min) continue;
    w += e;
    x += soma[i].x * e;
    y += soma[i].y * e;
    z += soma[i].z * e;
    count += 1;
  }
  if (w < 0.6 || count < 4) return null;
  return { x: x / w, y: y / w, z: z / w, mass: w, count };
}

export function hottest(energy, k = 28, min = 0.22) {
  const hits = [];
  for (let i = 0; i < energy.length; i++) {
    if (energy[i] >= min) hits.push(i);
  }
  hits.sort((a, b) => energy[b] - energy[a]);
  return hits.slice(0, k);
}
