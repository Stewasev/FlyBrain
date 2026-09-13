export const LIVE_MODES = [
  {
    id: "drift",
    title: "Drift",
    narration: "Random cells light up and bleed into their strongest partners. A toy on the real graph — not a recording.",
  },
  {
    id: "vision",
    title: "Vision",
    narration: "Pulses start in T4/T5 and feature detectors, then spill toward the central brain.",
    prefix: ["T4", "T5", "LC10", "LC4", "LPLC", "LC6", "LC11"],
  },
  {
    id: "courtship",
    title: "Courtship",
    narration: "P1, mAL, and song descending cells as a looping rumor. Simulated.",
    prefix: ["pC1_", "mAL"],
    exact: ["pIP10", "aSP22", "DNp13", "vPR6"],
  },
  {
    id: "walk",
    title: "Walk",
    narration: "Descending DNg/MDN and leg motor neurons. A fake gait on real partners.",
    exact: ["MDN", "DNg08", "DNg03", "DNg02_a", "Ti flexor MN", "Ti extensor MN", "Tr flexor MN", "Tr extensor MN"],
    prefix: ["DNg"],
  },
];

const K = 15;

function typeOf(n, strings) {
  return strings.type[n.type] || "";
}

export function collectSeeds(neurons, strings, mode) {
  const spec = LIVE_MODES.find((m) => m.id === mode) || LIVE_MODES[0];
  const out = [];
  for (const n of neurons) {
    if (!n.hasSoma) continue;
    const t = typeOf(n, strings);
    if (spec.exact && spec.exact.includes(t)) {
      out.push(n.id);
      continue;
    }
    if (spec.prefix && spec.prefix.some((p) => t.startsWith(p))) out.push(n.id);
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
    let base = i * K;
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
    energy: new Float32Array(n),
    next: new Float32Array(n),
    outI,
    outW,
    idToI,
    injectAt: 0,
    mode: "drift",
    seeds: [],
  };
}

export function setSimMode(sim, neurons, strings, mode) {
  sim.mode = mode;
  const ids = collectSeeds(neurons, strings, mode);
  sim.seeds = ids
    .map((id) => sim.idToI.get(id))
    .filter((i) => i != null);
  if (!sim.seeds.length) {
    const n = sim.n;
    sim.seeds = Array.from({ length: Math.min(400, n) }, (_, k) => Math.floor((k * 9973) % n));
  }
}

export function stepSim(sim, now) {
  const { n, energy, next, outI, outW } = sim;
  for (let i = 0; i < n; i++) next[i] = energy[i] * 0.86;
  for (let i = 0; i < n; i++) {
    const e = energy[i];
    if (e < 0.08) continue;
    const base = i * K;
    let wsum = 0;
    for (let k = 0; k < K; k++) {
      if (outI[base + k] >= 0) wsum += outW[base + k];
    }
    if (wsum <= 0) continue;
    const send = e * 0.48;
    for (let k = 0; k < K; k++) {
      const j = outI[base + k];
      if (j < 0) continue;
      next[j] += send * (outW[base + k] / wsum);
    }
  }
  if (now - sim.injectAt > 280) {
    sim.injectAt = now;
    const seeds = sim.seeds;
    if (seeds.length) {
      const burst = 12 + Math.floor(Math.random() * 18);
      for (let b = 0; b < burst; b++) {
        const j = seeds[Math.floor(Math.random() * seeds.length)];
        next[j] = 1;
      }
    }
  }
  for (let i = 0; i < n; i++) energy[i] = next[i] > 1 ? 1 : next[i];
  return energy;
}
