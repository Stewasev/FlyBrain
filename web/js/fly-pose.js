/** Drosophila joint angles. +Z anterior, +Y up, +X right. Radians. */

export const LEGS = ["L1", "R1", "L2", "R2", "L3", "R3"];
const TRIPOD_A = new Set(["L1", "R2", "L3"]);

const REST = {
  L1: { coxaYaw: 0.18, coxaAbduct: -0.82, coxaPitch: -0.5, femur: 0.92, tibia: 0.52, tarsus: 0.28 },
  R1: { coxaYaw: -0.18, coxaAbduct: 0.82, coxaPitch: -0.5, femur: 0.92, tibia: 0.52, tarsus: 0.28 },
  L2: { coxaYaw: 0.06, coxaAbduct: -0.95, coxaPitch: 0.06, femur: 0.84, tibia: 0.48, tarsus: 0.24 },
  R2: { coxaYaw: -0.06, coxaAbduct: 0.95, coxaPitch: 0.06, femur: 0.84, tibia: 0.48, tarsus: 0.24 },
  L3: { coxaYaw: -0.22, coxaAbduct: -0.78, coxaPitch: 0.62, femur: 0.9, tibia: 0.56, tarsus: 0.3 },
  R3: { coxaYaw: 0.22, coxaAbduct: 0.78, coxaPitch: 0.62, femur: 0.9, tibia: 0.56, tarsus: 0.3 },
};

const FOLD_STROKE = 1.28;
const BEAT_HZ = 20;

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function sideOf(name) {
  return name[0] === "L" ? -1 : 1;
}

function beat(now) {
  return (now * BEAT_HZ) / 1000;
}

function wingBeat(now) {
  const w = beat(now) * Math.PI * 2;
  return {
    stroke: 0.18 + Math.sin(w) * 0.95,
    flap: Math.cos(w) * 1.05,
    twist: Math.cos(w) * 0.72,
  };
}

function foldedWing() {
  return { stroke: FOLD_STROKE, flap: 0.16, twist: 0.12 };
}

function walkLeg(name, gait, speed, turn, flexL, flexR) {
  const rest = REST[name];
  const spd = clamp(speed, 0.05, 1);
  const p = (gait + (TRIPOD_A.has(name) ? 0 : 0.5)) % 1;
  const swing = p < 0.4;
  const s = swing ? p / 0.4 : (p - 0.4) / 0.6;
  const side = sideOf(name);
  const rear = 0.42 * spd;
  const front = -0.55 * spd;
  const turnBias = turn * side * 0.12;
  let coxaPitch;
  let femurFlex = 0;
  if (swing) {
    const ease = Math.sqrt(s);
    coxaPitch = rest.coxaPitch + lerp(rear, front, ease) + turnBias;
    femurFlex = Math.sin(s * Math.PI) * 0.42 * spd;
  } else {
    coxaPitch = rest.coxaPitch + lerp(front, rear, s) + turnBias;
  }
  const mn = name[0] === "L" ? flexL : flexR;
  return {
    swing,
    coxaYaw: rest.coxaYaw + turn * side * 0.04,
    coxaAbduct: rest.coxaAbduct,
    coxaPitch,
    femur: rest.femur + femurFlex + mn * 0.28,
    tibia: rest.tibia + femurFlex * 0.45,
    tarsus: rest.tarsus + (swing ? 0.08 : 0.18),
  };
}

function tuckedLeg(name) {
  const rest = REST[name];
  const side = sideOf(name);
  return {
    swing: false,
    coxaYaw: rest.coxaYaw * 0.4,
    coxaAbduct: side * 0.28,
    coxaPitch: 0.85,
    femur: 1.42,
    tibia: 0.85,
    tarsus: 0.2,
  };
}

function feedLeg(name) {
  const rest = REST[name];
  const pair = name[1];
  return {
    swing: false,
    coxaYaw: rest.coxaYaw,
    coxaAbduct: rest.coxaAbduct * (pair === "1" ? 1.05 : 0.9),
    coxaPitch: pair === "1" ? rest.coxaPitch - 0.15 : rest.coxaPitch,
    femur: rest.femur + (pair === "1" ? 0.12 : 0.02),
    tibia: rest.tibia,
    tarsus: rest.tarsus,
  };
}

function takeoffLeg(name, launch) {
  const rest = REST[name];
  const walk = walkLeg(name, 0, 0.15, 0, 0, 0);
  const fly = tuckedLeg(name);
  let crouch = 0;
  let extend = 0;
  if (launch < 0.35) crouch = launch / 0.35;
  else if (launch < 0.65) {
    const u = (launch - 0.35) / 0.3;
    crouch = Math.max(0, 1 - u * 1.8);
    extend = u;
  } else {
    extend = 1;
  }
  const isT2 = name[1] === "2";
  const femur =
    rest.femur +
    crouch * (isT2 ? 0.5 : 0.28) -
    extend * (isT2 ? 0.55 : 0.12);
  const t = clamp((launch - 0.55) / 0.45, 0, 1);
  return {
    swing: false,
    coxaYaw: lerp(walk.coxaYaw, fly.coxaYaw, t),
    coxaAbduct: lerp(walk.coxaAbduct, fly.coxaAbduct, t),
    coxaPitch: lerp(walk.coxaPitch, fly.coxaPitch, t),
    femur: lerp(femur, fly.femur, t),
    tibia: lerp(walk.tibia + crouch * 0.2, fly.tibia, t),
    tarsus: lerp(walk.tarsus, fly.tarsus, t),
  };
}

function blendLeg(a, b, t) {
  const k = clamp(t, 0, 1);
  return {
    swing: k < 0.5 ? a.swing : b.swing,
    coxaYaw: lerp(a.coxaYaw, b.coxaYaw, k),
    coxaAbduct: lerp(a.coxaAbduct, b.coxaAbduct, k),
    coxaPitch: lerp(a.coxaPitch, b.coxaPitch, k),
    femur: lerp(a.femur, b.femur, k),
    tibia: lerp(a.tibia, b.tibia, k),
    tarsus: lerp(a.tarsus, b.tarsus, k),
  };
}

function allLegs(fn) {
  const legs = {};
  for (const name of LEGS) legs[name] = fn(name);
  return legs;
}

export function pose({
  mode = "walk",
  gait = 0,
  speed = 0.5,
  turn = 0,
  now = 0,
  launch = 0,
  flexL = 0,
  flexR = 0,
} = {}) {
  const bob = Math.sin(gait * Math.PI * 2) * 0.03 * clamp(speed, 0, 1);
  if (mode === "feed") {
    const w = foldedWing();
    return {
      head: { pitch: 0.48 + Math.sin(now * 0.012) * 0.06, yaw: 0, roll: 0 },
      abdomen: { pitch: -0.04 },
      proboscis: 0.92,
      antenna: { L: 0.2, R: 0.2 },
      wingL: w,
      wingR: { ...w },
      haltereL: 0,
      haltereR: 0,
      legs: allLegs(feedLeg),
      thoraxPitch: 0.18,
    };
  }
  if (mode === "fly") {
    const w = wingBeat(now);
    const h = -w.flap * 0.85;
    return {
      head: { pitch: -0.08, yaw: turn * 0.05, roll: -turn * 0.08 },
      abdomen: { pitch: 0.28 },
      proboscis: 0,
      antenna: { L: 0.45, R: 0.45 },
      wingL: w,
      wingR: { ...w },
      haltereL: h,
      haltereR: h,
      legs: allLegs(tuckedLeg),
      thoraxPitch: -0.22,
    };
  }
  if (mode === "takeoff") {
    const fold = foldedWing();
    const flying = wingBeat(now);
    const unfold = clamp((launch - 0.25) / 0.5, 0, 1);
    const w = {
      stroke: lerp(fold.stroke, flying.stroke, unfold),
      flap: lerp(fold.flap, flying.flap, unfold),
      twist: lerp(fold.twist, flying.twist, unfold),
    };
    return {
      head: { pitch: lerp(0.12, -0.08, launch), yaw: turn * 0.04, roll: 0 },
      abdomen: { pitch: lerp(0.1, 0.28, launch) },
      proboscis: 0,
      antenna: { L: lerp(0.15, 0.45, launch), R: lerp(0.15, 0.45, launch) },
      wingL: w,
      wingR: { ...w },
      haltereL: -w.flap * unfold,
      haltereR: -w.flap * unfold,
      legs: allLegs((n) => takeoffLeg(n, launch)),
      thoraxPitch: lerp(0.08, -0.22, launch),
    };
  }
  if (mode === "land") {
    const t = 1 - clamp(launch, 0, 1);
    const flying = pose({ mode: "fly", gait, speed, turn, now });
    const standing = pose({ mode: "walk", gait, speed: 0.2, turn, now, flexL, flexR });
    return {
      head: {
        pitch: lerp(flying.head.pitch, standing.head.pitch, t),
        yaw: lerp(flying.head.yaw, standing.head.yaw, t),
        roll: lerp(flying.head.roll, standing.head.roll, t),
      },
      abdomen: { pitch: lerp(flying.abdomen.pitch, standing.abdomen.pitch, t) },
      proboscis: 0,
      antenna: {
        L: lerp(flying.antenna.L, standing.antenna.L, t),
        R: lerp(flying.antenna.R, standing.antenna.R, t),
      },
      wingL: {
        stroke: lerp(flying.wingL.stroke, standing.wingL.stroke, t),
        flap: lerp(flying.wingL.flap, standing.wingL.flap, t),
        twist: lerp(flying.wingL.twist, standing.wingL.twist, t),
      },
      wingR: {
        stroke: lerp(flying.wingR.stroke, standing.wingR.stroke, t),
        flap: lerp(flying.wingR.flap, standing.wingR.flap, t),
        twist: lerp(flying.wingR.twist, standing.wingR.twist, t),
      },
      haltereL: lerp(flying.haltereL, 0, t),
      haltereR: lerp(flying.haltereR, 0, t),
      legs: allLegs((n) => blendLeg(flying.legs[n], standing.legs[n], t)),
      thoraxPitch: lerp(flying.thoraxPitch, standing.thoraxPitch, t),
    };
  }

  const w = foldedWing();
  return {
    head: { pitch: 0.08 + bob, yaw: turn * 0.07, roll: -turn * 0.04 },
    abdomen: { pitch: 0.1 + bob },
    proboscis: 0,
    antenna: { L: 0.12 + Math.sin(now * 0.01) * 0.06, R: 0.12 + Math.cos(now * 0.011) * 0.06 },
    wingL: w,
    wingR: { ...w },
    haltereL: 0.08,
    haltereR: 0.08,
    legs: allLegs((n) => walkLeg(n, gait, speed, turn, flexL, flexR)),
    thoraxPitch: 0,
  };
}
