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

function meanEnergy(sim, idx) {
  if (!idx || !idx.length) return 0;
  let s = 0;
  for (const i of idx) s += sim.energy[i];
  return s / idx.length;
}

export function bindMotors(sim, neurons, strings) {
  const visL = [];
  const visR = [];
  const dnL = [];
  const dnR = [];
  const walk = [];
  const flexL = [];
  const flexR = [];
  const extL = [];
  const extR = [];
  for (const n of neurons) {
    if (!n.hasSoma) continue;
    const i = sim.idToI.get(n.id);
    if (i == null) continue;
    const t = typeOf(n, strings);
    const sc = strings.superclass[n.superclass] || "";
    const side = sideOf(n, strings);
    const vis = t.startsWith("T4") || t.startsWith("T5") || t.startsWith("LC");
    if (vis && side === "left") visL.push(i);
    if (vis && side === "right") visR.push(i);
    if (sc === "descending_neuron" && side === "left") dnL.push(i);
    if (sc === "descending_neuron" && side === "right") dnR.push(i);
    if (t === "MDN" || t.startsWith("DNg")) walk.push(i);
    if (t.includes("flexor MN") && side === "left") flexL.push(i);
    if (t.includes("flexor MN") && side === "right") flexR.push(i);
    if (t.includes("extensor MN") && side === "left") extL.push(i);
    if (t.includes("extensor MN") && side === "right") extR.push(i);
  }
  sim.motors = { visL, visR, dnL, dnR, walk, flexL, flexR, extL, extR };
}

function spray(sim, idx, amount) {
  if (!idx.length || amount <= 0) return;
  const n = Math.min(idx.length, 24 + Math.floor(amount * 40));
  for (let k = 0; k < n; k++) {
    const i = idx[Math.floor(Math.random() * idx.length)];
    sim.energy[i] = Math.min(1, sim.energy[i] + amount);
  }
}

export function closedStep(sim, drive) {
  const m = sim.motors;
  if (!m) return { speed: 0, turn: 0, flexL: 0, flexR: 0 };
  spray(sim, m.walk, drive.walk);
  spray(sim, m.visL, drive.visL);
  spray(sim, m.visR, drive.visR);
  if (drive.feed) {
    spray(sim, m.walk, 0.15);
    spray(sim, m.flexL, 0.4);
    spray(sim, m.flexR, 0.4);
  }
  stepSim(sim, 0, { autoInject: false });
  const visL = meanEnergy(sim, m.visL);
  const visR = meanEnergy(sim, m.visR);
  const dnL = meanEnergy(sim, m.dnL);
  const dnR = meanEnergy(sim, m.dnR);
  const flexL = meanEnergy(sim, m.flexL);
  const flexR = meanEnergy(sim, m.flexR);
  const walk = meanEnergy(sim, m.walk);
  const turn = (visR - visL) * 1.4 + (dnR - dnL) * 0.8;
  const speed = drive.feed ? 0.05 : Math.min(1, walk * 1.6 + 0.25 * (flexL + flexR));
  return { speed, turn, flexL, flexR, visL, visR };
}

export function stepSim(sim, now, opts = {}) {
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
  if (opts.autoInject !== false && now - sim.injectAt > 180) {
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
