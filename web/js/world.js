import * as THREE from "three";
import { makeHouseFly } from "./scale-objects.js";

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
  const fly = makeHouseFly();
  fly.scale.setScalar(0.36);
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

export function tickWorld(world, dt, now) {
  const body = world.agent;
  const hit = nearestFruit(world);
  if (world.state === "feed" && now < world.feedUntil) {
    body.rotation.x = Math.sin(now * 0.012) * 0.12;
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
    world.waypoint = null;
  }

  if (hit && hit.dist < (hit.fruit.userData.radius || 900) + 800) {
    world.state = "feed";
    world.feedUntil = now + 3500;
    world.eating = hit.fruit;
    body.rotation.x = 0.2;
    return "feed";
  }

  if (hit && hit.dist < 18000) {
    world.state = "seek";
    const dx = hit.fruit.position.x - body.position.x;
    const dz = hit.fruit.position.z - body.position.z;
    world.heading = Math.atan2(dx, dz);
  } else {
    world.state = "wander";
    body.rotation.x = 0;
    if (!world.waypoint || body.position.distanceTo(world.waypoint) < 800) {
      const a = Math.random() * Math.PI * 2;
      const r = 4000 + Math.random() * 16000;
      world.waypoint = new THREE.Vector3(Math.cos(a) * r, body.position.y, Math.sin(a) * r);
      clampToTable(world.waypoint);
    }
    const dx = world.waypoint.x - body.position.x;
    const dz = world.waypoint.z - body.position.z;
    const want = Math.atan2(dx, dz);
    let d = want - world.heading;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    world.heading += Math.max(-3 * dt, Math.min(3 * dt, d));
  }

  const speed = world.state === "seek" ? 2800 : 1600;
  body.position.x += Math.sin(world.heading) * speed * dt;
  body.position.z += Math.cos(world.heading) * speed * dt;
  clampToTable(body.position);
  body.position.y = 500;
  body.rotation.y = world.heading;
  body.rotation.z = Math.sin(now * 0.02) * 0.08;
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
