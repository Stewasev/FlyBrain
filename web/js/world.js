import * as THREE from "three";
import { makeFruitFly } from "./scale-objects.js";

const TABLE = 50000;

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
  agent.position.set(0, 500, 0);
  const fly = makeFruitFly();
  fly.scale.setScalar(1);
  fly.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    o.material = o.material.clone();
    o.material.transparent = true;
    o.material.depthWrite = o.material.opacity < 0.9;
  });
  agent.add(fly);
  root.add(agent);

  return { root, table, agent, fly, fruits: [], heading: 0, state: "wander", feedUntil: 0, waypoint: null };
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

export function senseWorld(world) {
  const hit = nearestFruit(world);
  if (world.state === "feed") {
    return { visL: 0.15, visR: 0.15, walk: 0.08, feed: 1 };
  }
  if (!hit) {
    return { visL: 0.08 + Math.random() * 0.12, visR: 0.08 + Math.random() * 0.12, walk: 0.55, feed: 0 };
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
  if (hit.dist < (hit.fruit.userData.radius || 900) + 900) {
    return { visL: 0.25, visR: 0.25, walk: 0.05, feed: 1, dist: hit.dist, fruit: hit.fruit };
  }
  return {
    visL: 0.25 + 0.75 * left,
    visR: 0.25 + 0.75 * rite,
    walk: 0.85,
    feed: 0,
    dist: hit.dist,
    fruit: hit.fruit,
  };
}

function stepLegs(world, motor, now) {
  const legs = world.fly.userData.legs || [];
  const spd = Math.max(0.15, motor.speed);
  const gait = now * 0.018 * (0.4 + spd);
  for (const leg of legs) {
    const phase = gait + (leg.userData.side === "left" ? 0 : Math.PI) + leg.userData.pair * 0.7;
    const flex = leg.userData.side === "left" ? motor.flexL : motor.flexR;
    const swing = Math.sin(phase) * (0.35 + 0.55 * spd) + (flex - 0.2) * 0.4;
    const side = leg.userData.side === "left" ? -1 : 1;
    leg.rotation.z = side * 0.65;
    leg.rotation.x = 0.2 + swing;
  }
  const wings = world.fly.userData.wings || [];
  for (const w of wings) {
    w.rotation.x = -1.05 + Math.sin(now * 0.04) * 0.08 * spd;
  }
}

export function tickWorld(world, dt, now, motor, drive) {
  const body = world.agent;
  drive = drive || senseWorld(world);
  if (drive.feed && drive.fruit) {
    if (world.state !== "feed") {
      world.state = "feed";
      world.feedUntil = now + 3200;
      world.eating = drive.fruit;
    }
  }
  if (world.state === "feed" && now < world.feedUntil) {
    body.rotation.x = 0.18 + Math.sin(now * 0.02) * 0.06;
    stepLegs(world, { speed: 0.1, flexL: 0.4, flexR: 0.4 }, now);
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
  }

  world.state = drive.fruit && !drive.feed ? "seek" : "wander";
  body.rotation.x = 0;
  const turn = Math.max(-4, Math.min(4, motor.turn));
  world.heading += turn * dt * 2.2;
  const speed = 400 + 2200 * Math.max(0, Math.min(1, motor.speed));
  body.position.x += Math.sin(world.heading) * speed * dt;
  body.position.z += Math.cos(world.heading) * speed * dt;
  clampToTable(body.position);
  body.position.y = 280;
  body.rotation.y = world.heading;
  body.rotation.z = turn * 0.12;
  stepLegs(world, motor, now);
  return world.state;
}

export function setFlyGhost(fly, camera, worldPos) {
  const d = camera.position.distanceTo(worldPos);
  const t = Math.max(0, Math.min(1, (d - 1200) / 2500));
  fly.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const base = o.userData.baseOpacity ?? (o.material.opacity < 0.5 ? 0.35 : 1);
    o.userData.baseOpacity = o.userData.baseOpacity ?? base;
    o.material.opacity = 0.08 + o.userData.baseOpacity * t * 0.92;
    o.material.transparent = true;
  });
}
