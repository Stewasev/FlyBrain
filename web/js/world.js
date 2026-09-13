import * as THREE from "../vendor/three.module.js";
import { applyRig, createRiggedFly, STAND_Y } from "./fly-rig.js";

const TABLE = 50000;
const CRUISE_Y = 2800;

function grape() {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({
    color: 0x6b1d8a,
    roughness: 0.35,
    metalness: 0.05,
  });
  const offsets = [
    [0, 500, 0],
    [450, 250, 200],
    [-400, 280, 180],
    [120, 220, -420],
    [-80, 700, 80],
  ];
  for (const [x, y, z] of offsets) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(420, 14, 12), skin);
    s.position.set(x, y, z);
    g.add(s);
  }
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(40, 50, 400, 6),
    new THREE.MeshStandardMaterial({ color: 0x3d5c28, roughness: 0.8 })
  );
  stem.position.y = 1050;
  g.add(stem);
  g.userData.kind = "grape";
  g.userData.radius = 900;
  return g;
}

function banana() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xe6c84a, roughness: 0.55 });
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 80, -2200),
    new THREE.Vector3(0, 400, -400),
    new THREE.Vector3(0, 200, 1200),
    new THREE.Vector3(0, -80, 2600),
  ]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 380, 10, false), mat));
  g.userData.kind = "banana";
  g.userData.radius = 1400;
  return g;
}

export function createWorld() {
  const root = new THREE.Group();
  root.name = "microWorld";
  root.visible = false;

  const table = new THREE.Mesh(
    new THREE.BoxGeometry(TABLE, 300, TABLE),
    new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.92, metalness: 0.02 })
  );
  table.position.y = -150;
  table.receiveShadow = true;
  root.add(table);

  const agent = new THREE.Group();
  agent.position.set(0, STAND_Y, 0);
  const fly = createRiggedFly();
  fly.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    o.material = o.material.clone();
    o.material.transparent = true;
    if (o.material.opacity >= 0.9) o.material.depthWrite = true;
  });
  agent.add(fly);
  root.add(agent);

  return {
    root,
    table,
    agent,
    fly,
    fruits: [],
    heading: 0,
    state: "wander",
    feedUntil: 0,
    waypoint: null,
    airborne: false,
    phase: "walk",
    gait: 0,
    launch: 0,
    wantFly: false,
    flyLockUntil: 0,
    standY: STAND_Y,
    wanderSince: 0,
  };
}

export function giveFruit(world, kind = "grape") {
  const fruit = kind === "banana" ? banana() : grape();
  const ang = Math.random() * Math.PI * 2;
  const r = 6000 + Math.random() * 14000;
  fruit.position.set(Math.cos(ang) * r, 200, Math.sin(ang) * r);
  world.root.add(fruit);
  world.fruits.push(fruit);
  return fruit;
}

export function clearFruit(world) {
  for (const f of world.fruits) {
    world.root.remove(f);
    f.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
  }
  world.fruits.length = 0;
  world.state = "wander";
  world.waypoint = null;
  world.wanderSince = 0;
}

function nearestFruit(world) {
  let best = null;
  let bestD = Infinity;
  const p = world.agent.position;
  for (const f of world.fruits) {
    const d = p.distanceTo(f.position);
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  return best ? { fruit: best, dist: bestD } : null;
}

function clampToTable(pos) {
  const m = TABLE * 0.42;
  pos.x = Math.max(-m, Math.min(m, pos.x));
  pos.z = Math.max(-m, Math.min(m, pos.z));
}

function inAir(world) {
  return world.phase === "fly" || world.phase === "takeoff" || world.airborne;
}

export function beginTakeoff(world, now = 0, hold = false) {
  if (world.phase === "fly" || world.phase === "takeoff") {
    world.wantFly = hold;
    world.flyLockUntil = now + 2800;
    return;
  }
  world.wantFly = hold;
  world.phase = "takeoff";
  world.launch = 0;
  world.state = "wander";
  world.flyLockUntil = now + 2800;
}

export function beginLanding(world) {
  world.wantFly = false;
  if (world.phase === "walk" || world.phase === "feed") return;
  world.phase = "land";
  if (world.launch < 0.2) world.launch = 1;
}

export function setAirborne(world, on, now = 0) {
  if (on) beginTakeoff(world, now, true);
  else beginLanding(world);
}

export function senseWorld(world) {
  const hit = nearestFruit(world);
  const flying = inAir(world);
  if (world.state === "feed") {
    return { visL: 0.15, visR: 0.15, walk: 0.08, feed: 1, fly: 0 };
  }
  if (flying && !hit) {
    return {
      visL: 0.2 + Math.random() * 0.15,
      visR: 0.2 + Math.random() * 0.15,
      walk: 0.12,
      feed: 0,
      fly: 1,
    };
  }
  if (!hit) {
    return { visL: 0.08 + Math.random() * 0.12, visR: 0.08 + Math.random() * 0.12, walk: 0.55, feed: 0, fly: 0 };
  }
  const body = world.agent;
  const dx = hit.fruit.position.x - body.position.x;
  const dz = hit.fruit.position.z - body.position.z;
  const h = world.heading;
  const right = -Math.sin(h) * dz + Math.cos(h) * dx;
  const fwd = Math.cos(h) * dz + Math.sin(h) * dx;
  const ang = Math.atan2(right, fwd);
  const left = Math.max(0, Math.min(1, -ang / (Math.PI / 2)));
  const rite = Math.max(0, Math.min(1, ang / (Math.PI / 2)));
  const reach = (hit.fruit.userData.radius || 900) + 900;
  if (!flying && hit.dist < reach) {
    return { visL: 0.25, visR: 0.25, walk: 0.05, feed: 1, fly: 0, dist: hit.dist, fruit: hit.fruit };
  }
  return {
    visL: 0.25 + 0.75 * left,
    visR: 0.25 + 0.75 * rite,
    walk: flying ? 0.2 : 0.85,
    feed: 0,
    fly: flying ? 1 : 0,
    dist: hit.dist,
    fruit: hit.fruit,
  };
}

function poseMode(world) {
  if (world.state === "feed") return "feed";
  if (world.phase === "takeoff") return "takeoff";
  if (world.phase === "land") return "land";
  if (world.phase === "fly" || world.airborne) return "fly";
  return "walk";
}

function applyBody(world, dt, now, motor, drive) {
  const body = world.agent;
  const turn = Math.max(-4, Math.min(4, motor.turn || 0));
  world.heading += turn * dt * 2.2;
  const flying = inAir(world);
  const speed = flying
    ? 900 + 2800 * Math.max(0.2, motor.speed || 0)
    : 350 + 2000 * Math.max(0, Math.min(1, motor.speed || 0));
  body.position.x += Math.sin(world.heading) * speed * dt;
  body.position.z += Math.cos(world.heading) * speed * dt;
  clampToTable(body.position);
  body.rotation.y = world.heading;
  body.rotation.z = turn * (flying ? 0.18 : 0.12);
  world.gait = (world.gait + dt * (0.8 + (motor.speed || 0) * 2.4)) % 1;
  applyRig(world.fly, {
    mode: poseMode(world),
    gait: world.gait,
    speed: motor.speed || 0,
    turn,
    now,
    launch: world.launch,
    flexL: motor.flexL || 0,
    flexR: motor.flexR || 0,
  });
  return turn;
}

export function tickWorld(world, dt, now, motor, drive) {
  const body = world.agent;
  drive = drive || senseWorld(world);
  motor = motor || { speed: 0.4, turn: 0, flexL: 0, flexR: 0, lift: 0, jump: 0 };

  if (world.wantFly && now > world.flyLockUntil + 7000) world.wantFly = false;

  if (world.state === "feed" && now < world.feedUntil) {
    body.rotation.x = 0.22;
    body.position.y = world.standY;
    applyRig(world.fly, { mode: "feed", gait: 0, speed: 0.1, turn: 0, now, launch: 0 });
    return "feed";
  }
  if (world.state === "feed") {
    if (world.eating) {
      world.eating.scale.multiplyScalar(0.55);
      if (world.eating.scale.x < 0.2) {
        world.root.remove(world.eating);
        world.fruits = world.fruits.filter((f) => f !== world.eating);
      }
      world.eating = null;
    }
    world.state = "wander";
    world.wanderSince = now;
    beginTakeoff(world, now, false);
  }

  if (drive.feed && drive.fruit && !inAir(world) && world.phase !== "takeoff") {
    if (world.state !== "feed") {
      world.state = "feed";
      world.feedUntil = now + 3200;
      world.eating = drive.fruit;
      world.phase = "walk";
      world.airborne = false;
    }
  }

  if (world.phase === "walk" && world.state !== "feed") {
    if (!world.fruits.length && !world.wanderSince) world.wanderSince = now;
    if (world.fruits.length) world.wanderSince = 0;
    if (motor.jump > 0.42 || motor.lift > 0.38) beginTakeoff(world, now, false);
    else if (!world.fruits.length && world.wanderSince && now - world.wanderSince > 5500) {
      beginTakeoff(world, now, false);
    }
  }

  if (world.phase === "fly" && drive.fruit && drive.dist < 1500 && now > world.flyLockUntil && !world.wantFly) {
    beginLanding(world);
  }

  if (world.phase === "takeoff") {
    world.launch = Math.min(1, world.launch + dt / 0.45);
    const jump = Math.max(0, (world.launch - 0.32) / 0.68);
    body.position.y = world.standY + (CRUISE_Y - world.standY) * jump * jump;
    world.airborne = jump > 0.04;
    body.rotation.x = -0.22 * jump;
    applyBody(world, dt, now, motor, drive);
    if (world.launch >= 1) world.phase = "fly";
    return "takeoff";
  }

  if (world.phase === "land") {
    world.launch = Math.max(0, world.launch - dt / 0.5);
    const t = world.launch;
    body.position.y = world.standY + (CRUISE_Y - world.standY) * t * t;
    world.airborne = t > 0.08;
    body.rotation.x = -0.22 * t;
    applyBody(world, dt, now, motor, drive);
    if (world.launch <= 0) {
      world.phase = "walk";
      world.airborne = false;
      world.wantFly = false;
      body.position.y = world.standY;
      body.rotation.x = 0;
    }
    return "land";
  }

  if (world.phase === "fly") {
    world.airborne = true;
    world.launch = 1;
    const wantY = CRUISE_Y + Math.sin(now * 0.003) * 180;
    body.position.y += (wantY - body.position.y) * Math.min(1, dt * 1.8);
    body.rotation.x = -0.25;
    applyBody(world, dt, now, motor, drive);
    return "fly";
  }

  world.state = drive.fruit && !drive.feed ? "seek" : "wander";
  world.airborne = false;
  body.position.y = world.standY;
  body.rotation.x = 0;
  applyBody(world, dt, now, motor, drive);
  return world.state;
}

export function setFlyGhost(fly, camera, worldPos) {
  const d = camera.position.distanceTo(worldPos);
  const t = Math.max(0, Math.min(1, (d - 1200) / 2500));
  fly.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const base = o.userData.baseOpacity ?? (o.material.opacity < 0.5 ? 0.38 : 1);
    o.userData.baseOpacity = o.userData.baseOpacity ?? base;
    o.material.opacity = 0.08 + o.userData.baseOpacity * t * 0.92;
    o.material.transparent = true;
  });
}
