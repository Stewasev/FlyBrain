import * as THREE from "../vendor/three.module.js";
import { LEGS, pose } from "./fly-pose.js";

export const STAND_Y = 680;

function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.04, ...extra });
}

function bone(len, r0, r1, material) {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, 6), material);
  mesh.position.y = -len / 2;
  g.add(mesh);
  g.userData.len = len;
  return g;
}

function wingGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(40, 70, 260, 175, 620, 145);
  s.bezierCurveTo(880, 115, 1080, 40, 1120, -8);
  s.bezierCurveTo(1040, -70, 720, -155, 260, -95);
  s.bezierCurveTo(80, -45, 18, -12, 0, 0);
  return new THREE.ShapeGeometry(s, 12);
}

function wingVeins() {
  const pts = [];
  const add = (a, b) => pts.push(...a, ...b);
  add([0, 0, 0], [1080, 8, 0]);
  add([0, 0, 0], [620, 90, 0]);
  add([0, 0, 0], [540, -70, 0]);
  add([280, 20, 0], [720, 70, 0]);
  add([200, -10, 0], [640, -55, 0]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

function arista() {
  const g = new THREE.Group();
  const dark = mat(0x1a120c);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2, 110, 4), dark);
  shaft.position.y = 55;
  g.add(shaft);
  for (let i = 0; i < 5; i++) {
    const br = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.6, 36, 3), dark);
    br.position.set((i % 2 === 0 ? 10 : -10), 30 + i * 14, 0);
    br.rotation.z = (i % 2 === 0 ? -1 : 1) * 0.9;
    g.add(br);
  }
  return g;
}

function makeAntenna(side, tan, dark) {
  const root = new THREE.Group();
  root.position.set(side * 55, 70, 90);
  const scape = bone(36, 10, 8, tan);
  scape.rotation.x = -0.9;
  const fun = bone(70, 12, 9, dark);
  fun.position.y = -36;
  const ar = arista();
  ar.position.y = -70;
  ar.rotation.x = -0.4;
  fun.add(ar);
  scape.add(fun);
  root.add(scape);
  return root;
}

function tarsusChain(total, material, clawMat, sexComb) {
  const fracs = [0.3, 0.18, 0.16, 0.14, 0.22];
  const root = new THREE.Group();
  let parent = root;
  let first = null;
  for (let i = 0; i < 5; i++) {
    const len = total * fracs[i];
    const seg = bone(len, 9 - i, 7 - i * 0.8, material);
    if (i === 0) first = seg;
    else seg.position.y = -(parent.userData.len || 0);
    parent.add(seg);
    parent = seg;
  }
  const claw = new THREE.Mesh(new THREE.ConeGeometry(6, 22, 4), clawMat);
  claw.position.y = -total * fracs[4] - 8;
  claw.rotation.x = 0.5;
  parent.add(claw);
  const claw2 = claw.clone();
  claw2.rotation.z = 0.6;
  parent.add(claw2);
  if (sexComb && first) {
    for (let i = 0; i < 6; i++) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(5, 14, 4), clawMat);
      tooth.position.set(12, -18 - i * 8, 0);
      first.add(tooth);
    }
  }
  root.userData.len = total;
  return { root, first };
}

function makeHaltere(side, tan, dark) {
  const g = new THREE.Group();
  g.position.set(side * 90, 80, -120);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(6, 5, 90, 5), tan);
  stalk.position.y = -20;
  stalk.rotation.x = 0.6;
  const club = new THREE.Mesh(new THREE.SphereGeometry(16, 8, 6), dark);
  club.position.set(0, -70, -40);
  g.add(stalk, club);
  return g;
}

export function createRiggedFly() {
  const tan = mat(0xc4a056);
  const dark = mat(0x2a1810);
  const stripe = mat(0x3a2414);
  const eye = mat(0xe01810, { roughness: 0.26 });
  const claw = mat(0x24180e);
  const wingMat = mat(0xe8e0c8, {
    transparent: true,
    opacity: 0.38,
    side: THREE.DoubleSide,
    depthWrite: false,
    roughness: 0.22,
  });
  const veinMat = new THREE.LineBasicMaterial({ color: 0xb8a888, transparent: true, opacity: 0.55 });

  const root = new THREE.Group();
  root.name = "drosophilaRig";

  const thorax = new THREE.Group();
  thorax.name = "thorax";
  const thoraxM = new THREE.Mesh(new THREE.SphereGeometry(270, 16, 14), tan);
  thoraxM.scale.set(1.12, 0.92, 1.22);
  const scutellum = new THREE.Mesh(new THREE.SphereGeometry(90, 10, 8), tan);
  scutellum.position.set(0, 40, -220);
  scutellum.scale.set(1.3, 0.7, 0.9);
  thorax.add(thoraxM, scutellum);
  for (const [x, y, z] of [
    [50, 160, 40],
    [-50, 160, 40],
    [80, 140, -60],
    [-80, 140, -60],
    [40, 150, 140],
    [-40, 150, 140],
  ]) {
    const br = new THREE.Mesh(new THREE.ConeGeometry(5, 55, 4), dark);
    br.position.set(x, y, z);
    br.rotation.x = -0.5;
    thorax.add(br);
  }
  root.add(thorax);

  const head = new THREE.Group();
  head.name = "head";
  head.position.set(0, 30, 430);
  const headM = new THREE.Mesh(new THREE.SphereGeometry(210, 14, 12), tan);
  headM.scale.set(1.15, 0.95, 0.9);
  const e1 = new THREE.Mesh(new THREE.SphereGeometry(168, 14, 12), eye);
  e1.position.set(155, 35, 30);
  e1.scale.set(1, 1.05, 0.85);
  const e2 = e1.clone();
  e2.position.x = -155;
  const ocelli = new THREE.Mesh(new THREE.SphereGeometry(18, 6, 6), mat(0x8a2018, { roughness: 0.3 }));
  ocelli.position.set(0, 150, 10);
  head.add(headM, e1, e2, ocelli);
  const antennaL = makeAntenna(-1, tan, dark);
  const antennaR = makeAntenna(1, tan, dark);
  head.add(antennaL, antennaR);

  const proboscis = new THREE.Group();
  proboscis.name = "proboscis";
  proboscis.position.set(0, -70, 140);
  const rostrum = new THREE.Mesh(new THREE.CylinderGeometry(18, 14, 140, 6), tan);
  rostrum.position.y = -70;
  const labellum = new THREE.Mesh(new THREE.SphereGeometry(22, 8, 6), mat(0xa07040));
  labellum.position.y = -145;
  labellum.scale.set(1.3, 0.7, 1);
  proboscis.add(rostrum, labellum);
  head.add(proboscis);
  thorax.add(head);

  const abdomen = new THREE.Group();
  abdomen.name = "abdomen";
  abdomen.position.set(0, -20, -250);
  for (let i = 0; i < 6; i++) {
    const r = 210 - i * 22;
    const ring = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), i % 2 === 0 ? tan : stripe);
    ring.position.z = -70 - i * 145;
    ring.scale.set(1.08 - i * 0.08, 0.82, 0.72);
    abdomen.add(ring);
  }
  const tip = new THREE.Mesh(new THREE.SphereGeometry(70, 10, 8), dark);
  tip.position.z = -980;
  tip.scale.set(0.9, 0.6, 1.1);
  abdomen.add(tip);
  thorax.add(abdomen);

  const wingGeo = wingGeometry();
  const veinGeo = wingVeins();
  function makeWing(side) {
    const hinge = new THREE.Group();
    hinge.position.set(side * 40, 150, -20);
    hinge.scale.x = side;
    const blade = new THREE.Mesh(wingGeo, wingMat.clone());
    blade.rotation.x = -Math.PI / 2;
    const veins = new THREE.LineSegments(veinGeo, veinMat.clone());
    veins.rotation.x = -Math.PI / 2;
    hinge.add(blade, veins);
    return hinge;
  }
  const wingL = makeWing(-1);
  wingL.name = "wingL";
  const wingR = makeWing(1);
  wingR.name = "wingR";
  thorax.add(wingL, wingR);

  const haltereL = makeHaltere(-1, tan, dark);
  const haltereR = makeHaltere(1, tan, dark);
  thorax.add(haltereL, haltereR);

  const attach = {
    L1: [-125, -45, 175],
    R1: [125, -45, 175],
    L2: [-150, -55, 15],
    R2: [150, -55, 15],
    L3: [-140, -48, -155],
    R3: [140, -48, -155],
  };
  const lens = {
    L1: [72, 310, 270, 210],
    R1: [72, 310, 270, 210],
    L2: [80, 350, 300, 230],
    R2: [80, 350, 300, 230],
    L3: [88, 410, 345, 250],
    R3: [88, 410, 345, 250],
  };
  const legs = {};
  for (const name of LEGS) {
    const [cx, cy, cz] = attach[name];
    const [lc, lf, lt, lta] = lens[name];
    const coxa = bone(lc, 26, 22, tan);
    coxa.name = `${name}_coxa`;
    coxa.position.set(cx, cy, cz);
    const femur = bone(lf, 20, 15, tan);
    femur.name = `${name}_femur`;
    femur.position.y = -lc;
    const tibia = bone(lt, 13, 10, dark);
    tibia.name = `${name}_tibia`;
    tibia.position.y = -lf;
    const { root: tarsus } = tarsusChain(lta, claw, claw, name[1] === "1");
    tarsus.name = `${name}_tarsus`;
    tarsus.position.y = -lt;
    tibia.add(tarsus);
    femur.add(tibia);
    coxa.add(femur);
    thorax.add(coxa);
    legs[name] = { coxa, femur, tibia, tarsus };
  }

  root.userData = {
    thorax,
    head,
    abdomen,
    wingL,
    wingR,
    haltereL,
    haltereR,
    antennaL,
    antennaR,
    proboscis,
    legs,
  };
  applyRig(root, { mode: "walk", gait: 0, speed: 0.3, turn: 0, now: 0 });
  return root;
}

export function applyRig(rig, opts) {
  const a = pose(opts);
  const u = rig.userData;
  u.head.rotation.set(a.head.pitch, a.head.yaw, a.head.roll);
  u.abdomen.rotation.x = a.abdomen.pitch;
  u.proboscis.rotation.x = a.proboscis * 1.15;
  u.antennaL.rotation.x = a.antenna.L;
  u.antennaR.rotation.x = a.antenna.R;
  u.wingL.rotation.order = "YZX";
  u.wingR.rotation.order = "YZX";
  u.wingL.rotation.set(a.wingL.twist, a.wingL.stroke, a.wingL.flap);
  u.wingR.rotation.set(a.wingR.twist, a.wingR.stroke, a.wingR.flap);
  u.haltereL.rotation.x = a.haltereL;
  u.haltereR.rotation.x = a.haltereR;
  for (const name of LEGS) {
    const L = a.legs[name];
    const j = u.legs[name];
    j.coxa.rotation.set(L.coxaPitch, L.coxaYaw, L.coxaAbduct);
    j.femur.rotation.x = L.femur;
    j.tibia.rotation.x = L.tibia;
    j.tarsus.rotation.x = L.tarsus;
  }
}

export { pose };
