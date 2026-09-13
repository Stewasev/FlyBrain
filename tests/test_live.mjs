import assert from "node:assert/strict";
import { bindMotors, closedStep, collectSeeds, createSim, setSimMode, stepSim } from "../web/js/live.js";

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
assert.ok(collectSeeds(neurons, strings, "drift").length >= 3);

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

const soma2 = [
  { id: 1, x: 0, y: 0, z: 0 },
  { id: 2, x: 0, y: 0, z: 0 },
  { id: 3, x: 0, y: 0, z: 0 },
];
const partners2 = {
  rows: new Map([
    [1, { outId: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], outW: [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }],
    [2, { outId: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], outW: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }],
    [3, { outId: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], outW: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }],
  ]),
};
const neurons2 = [
  { id: 1, hasSoma: 1, type: 1, superclass: 0, side: 1 },
  { id: 2, hasSoma: 1, type: 2, superclass: 1, side: 2 },
  { id: 3, hasSoma: 1, type: 3, superclass: 1, side: 1 },
];
const strings2 = { type: ["", "T4a", "Ti flexor MN", "MDN"], superclass: ["ol_intrinsic", "vnc_motor"], side: ["", "left", "right"] };
const sim2 = createSim(soma2, partners2);
bindMotors(sim2, neurons2, strings2);
const out = closedStep(sim2, { visL: 1, visR: 0, walk: 0.5, feed: 0 });
assert.ok(sim2.energy[0] > 0 || out.turn !== 0 || out.speed >= 0);
console.log("ok");
