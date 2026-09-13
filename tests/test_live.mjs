import assert from "node:assert/strict";
import { collectSeeds, createSim, setSimMode, stepSim } from "../web/js/live.js";

const strings = { type: ["", "T4a", "pC1_1a", "MDN"] };
const neurons = [
  { id: 1, type: 1, hasSoma: 1 },
  { id: 2, type: 2, hasSoma: 1 },
  { id: 3, type: 3, hasSoma: 1 },
  { id: 4, type: 1, hasSoma: 0 },
];
assert.deepEqual(collectSeeds(neurons, strings, "vision"), [1]);
assert.deepEqual(collectSeeds(neurons, strings, "courtship"), [2]);
assert.deepEqual(collectSeeds(neurons, strings, "walk"), [3]);

const soma = [
  { id: 10 },
  { id: 20 },
  { id: 30 },
];
const partners = {
  rows: new Map([
    [10, { outId: [20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], outW: [8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }],
    [20, { outId: [30, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], outW: [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }],
    [30, { outId: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], outW: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }],
  ]),
};
const sim = createSim(soma, partners);
sim.seeds = [0];
sim.energy[0] = 1;
sim.injectAt = 1e12;
stepSim(sim, 0);
assert.ok(sim.energy[1] > 0.2, "activity jumps to the partner");
assert.ok(sim.energy[0] < 1, "source decays");
setSimMode(sim, neurons, strings, "drift");
assert.ok(sim.seeds.length);
console.log("ok");
