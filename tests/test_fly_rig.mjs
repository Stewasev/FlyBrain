import assert from "node:assert/strict";
import { applyRig, createRiggedFly, STAND_Y } from "../web/js/fly-rig.js";
import { beginLanding, beginTakeoff, createWorld, tickWorld } from "../web/js/world.js";

const fly = createRiggedFly();
assert.equal(fly.name, "drosophilaRig");
for (const name of ["L1", "R1", "L2", "R2", "L3", "R3"]) {
  assert.ok(fly.userData.legs[name].coxa, name);
  assert.ok(fly.userData.legs[name].tarsus, `${name} tarsus`);
}
assert.ok(fly.userData.wingL);
assert.ok(fly.userData.proboscis);
assert.ok(fly.userData.haltereL);

applyRig(fly, { mode: "fly", now: 0, gait: 0, speed: 1, turn: 0 });
const flap0 = fly.userData.wingL.rotation.z;
applyRig(fly, { mode: "fly", now: 25, gait: 0, speed: 1, turn: 0 });
const flap1 = fly.userData.wingL.rotation.z;
assert.ok(Math.abs(flap0 - flap1) > 0.4, "wing flap changes over a half-stroke");

applyRig(fly, { mode: "walk", now: 0, gait: 0.2, speed: 1, turn: 0 });
assert.ok(
  fly.userData.legs.L1.femur.rotation.x > fly.userData.legs.R1.femur.rotation.x,
  "tripod: L1 flexed while R1 plants"
);

const world = createWorld();
assert.equal(world.phase, "walk");
beginTakeoff(world, 0, true);
assert.equal(world.phase, "takeoff");
const motor = { speed: 0.5, turn: 0.1, flexL: 0, flexR: 0, lift: 0, jump: 0 };
let phase = "takeoff";
for (let i = 0; i < 40; i++) {
  phase = tickWorld(world, 0.05, 200 + i * 50, motor, { visL: 0.2, visR: 0.2, walk: 0.3, feed: 0, fly: 1 });
}
assert.equal(phase, "fly");
assert.ok(world.agent.position.y > 1000, "takeoff leaves the table");
beginLanding(world);
assert.equal(world.phase, "land");
for (let i = 0; i < 30; i++) {
  phase = tickWorld(world, 0.05, 4000 + i * 50, motor, { visL: 0.2, visR: 0.2, walk: 0.3, feed: 0, fly: 0 });
}
assert.equal(world.phase, "walk");
assert.equal(phase, "wander");
assert.ok(Math.abs(world.agent.position.y - STAND_Y) < 2, "landing returns to standing height");

console.log("ok");
