import assert from "node:assert/strict";
import { pose } from "../web/js/fly-pose.js";

const TRIPOD_A = ["L1", "R2", "L3"];
const TRIPOD_B = ["R1", "L2", "R3"];

function walk(gait, extra = {}) {
  return pose({ mode: "walk", gait, speed: 1, turn: 0, now: 0, ...extra });
}

const midSwingA = walk(0.2);
for (const name of TRIPOD_A) {
  assert.equal(midSwingA.legs[name].swing, true, `${name} swings at gait 0.2`);
}
for (const name of TRIPOD_B) {
  assert.equal(midSwingA.legs[name].swing, false, `${name} stance at gait 0.2`);
}

assert.ok(
  midSwingA.legs.L1.femur > midSwingA.legs.R1.femur,
  "swinging foreleg flexes more (shortens, lifts the foot)"
);
assert.ok(
  midSwingA.legs.L1.coxaPitch < midSwingA.legs.R1.coxaPitch,
  "swinging T1 is protracted (more negative pitch = forward)"
);

const midSwingB = walk(0.7);
assert.equal(midSwingB.legs.R1.swing, true);
assert.equal(midSwingB.legs.L1.swing, false);
assert.ok(midSwingB.legs.R1.femur > midSwingB.legs.L1.femur);

const leftTurn = walk(0.2, { turn: 2 });
const rightTurn = walk(0.2, { turn: -2 });
assert.ok(
  Math.abs(leftTurn.legs.R1.coxaPitch - leftTurn.legs.L1.coxaPitch) >
    Math.abs(walk(0.2).legs.R1.coxaPitch - walk(0.2).legs.L1.coxaPitch) * 0.5,
  "turning biases stride"
);
assert.ok(leftTurn.head.yaw > 0);
assert.ok(rightTurn.head.yaw < 0);

const folded = walk(0);
assert.ok(folded.wingL.stroke > 0.8, "walk: wings swept back over the abdomen");
assert.ok(folded.proboscis < 0.15);

const fly0 = pose({ mode: "fly", gait: 0, speed: 1, turn: 0, now: 0 });
const fly1 = pose({ mode: "fly", gait: 0, speed: 1, turn: 0, now: 25 });
assert.ok(Math.abs(fly0.wingL.flap - fly1.wingL.flap) > 0.4, "wings beat in flight");
assert.ok(Math.abs(fly0.wingL.twist - fly1.wingL.twist) > 0.15, "pronation/supination");
assert.ok(fly0.legs.L1.femur > folded.legs.L1.femur, "legs tuck in flight");
assert.ok(fly0.wingL.flap === fly0.wingR.flap, "mirrored wings share flap (mesh is scaled)");
assert.ok(Math.abs(fly0.haltereL - fly0.wingL.flap) > 0.5, "halteres beat out of phase");

const feed = pose({ mode: "feed", gait: 0, speed: 0, turn: 0, now: 1000 });
assert.ok(feed.proboscis > 0.7, "proboscis extends to feed");
assert.ok(feed.head.pitch > 0.35, "head pitches down to the fruit");

const crouch = pose({ mode: "takeoff", gait: 0, speed: 0.4, turn: 0, now: 0, launch: 0.15 });
const jump = pose({ mode: "takeoff", gait: 0, speed: 0.4, turn: 0, now: 0, launch: 0.5 });
assert.ok(crouch.legs.L2.femur > jump.legs.L2.femur, "T2 crouches then extends for the jump");
assert.ok(jump.wingL.stroke < crouch.wingL.stroke, "wings unfold during takeoff");

const land = pose({ mode: "land", gait: 0, speed: 0.3, turn: 0, now: 0, launch: 0.2 });
assert.ok(land.legs.L1.femur < fly0.legs.L1.femur, "legs reach down to land");

const flex = walk(0.15, { flexL: 1, flexR: 0 });
assert.ok(flex.legs.L1.femur > walk(0.15).legs.L1.femur, "left flexor MN extra-bends left legs");

console.log("ok");
