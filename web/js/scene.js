import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VOID, colorFor } from "./palette.js";

const CAMERAS = {
  whole: { pos: [420, 80, 40], look: [0, 0, 0] },
  brain: { pos: [80, 220, 40], look: [0, 80, 0] },
  vnc: { pos: [80, -280, 40], look: [0, -120, 0] },
  optic: { pos: [260, 140, 20], look: [80, 90, 0] },
  courtship: { pos: [40, 160, 180], look: [0, 40, 0] },
};

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(VOID, 1);

  const scene = new THREE.Scene();
  scene.fog = null;

  const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 40000);
  camera.position.set(...CAMERAS.whole.pos);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.85;
  controls.maxDistance = 18000;

  const scale = buildScaleRefs();
  scene.add(scale);

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  return { renderer, scene, camera, controls, scale, resize, cameras: CAMERAS };
}

function lineMat(opacity = 0.7) {
  return new THREE.LineBasicMaterial({
    color: 0xd4c4a0,
    transparent: true,
    opacity,
    depthWrite: false,
  });
}

function makeLabel(text, width = 420) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 96;
  const g = c.getContext("2d");
  g.clearRect(0, 0, 512, 96);
  g.font = "52px 'Fragment Mono', ui-monospace, monospace";
  g.fillStyle = "#e6dcc8";
  g.textBaseline = "middle";
  g.fillText(text, 12, 48);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  sprite.scale.set(width, width * (96 / 512), 1);
  sprite.userData.baseOpacity = 0.92;
  return sprite;
}

function polylineYZ(points, closed = false) {
  const pos = [];
  const n = points.length;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    pos.push(0, a[1], a[0], 0, b[1], b[0]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const mesh = new THREE.LineSegments(geo, lineMat());
  mesh.userData.baseOpacity = 0.75;
  return mesh;
}

function squareYZ(size) {
  const h = size / 2;
  return polylineYZ(
    [
      [-h, -h],
      [h, -h],
      [h, h],
      [-h, h],
    ],
    true
  );
}

function micrometer() {
  const g = new THREE.Group();
  const y = 0;
  const pos = [0, y, 0, 0, y, 1000];
  for (let i = 0; i <= 10; i++) {
    const z = i * 100;
    const h = i === 0 || i === 10 ? 70 : i === 5 ? 50 : 28;
    pos.push(0, y, z, 0, y + h, z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const bar = new THREE.LineSegments(geo, lineMat(0.85));
  bar.userData.baseOpacity = 0.85;
  g.add(bar);
  const label = makeLabel("1 mm", 320);
  label.position.set(0, 130, 500);
  g.add(label);
  return g;
}

function flyOutline() {
  const g = new THREE.Group();
  const body = [
    [-1080, 20],
    [-1020, 110],
    [-920, 250],
    [-800, 310],
    [-700, 240],
    [-640, 90],
    [-600, 50],
    [-520, 210],
    [-340, 430],
    [-120, 400],
    [40, 220],
    [180, 150],
    [420, 170],
    [780, 90],
    [1100, -30],
    [1320, -110],
    [1460, -40],
    [1480, 20],
    [1400, -160],
    [1100, -260],
    [720, -300],
    [360, -290],
    [80, -260],
    [-160, -240],
    [-420, -220],
    [-640, -170],
    [-860, -130],
    [-1020, -50],
    [-1080, 20],
  ];
  const wing = [
    [-80, 360],
    [80, 720],
    [360, 920],
    [720, 840],
    [900, 560],
    [620, 280],
    [220, 180],
  ];
  const antenna = [
    [-900, 240],
    [-1080, 420],
    [-1040, 560],
  ];
  const legs = [
    [-420, -220],
    [-480, -520],
    [-440, -760],
    [-200, -230],
    [-160, -540],
    [-80, -780],
    [60, -255],
    [120, -530],
    [200, -760],
  ];
  g.add(polylineYZ(body, true));
  g.add(polylineYZ(wing));
  g.add(polylineYZ(antenna));
  const legPos = [];
  for (let i = 0; i < 3; i++) {
    const a = legs[i * 3];
    const b = legs[i * 3 + 1];
    const c = legs[i * 3 + 2];
    legPos.push(0, a[1], a[0], 0, b[1], b[0], 0, b[1], b[0], 0, c[1], c[0]);
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute("position", new THREE.Float32BufferAttribute(legPos, 3));
  const lm = new THREE.LineSegments(lg, lineMat(0.55));
  lm.userData.baseOpacity = 0.55;
  g.add(lm);
  const label = makeLabel("adult Drosophila  ~2.5 mm", 1100);
  label.position.set(0, -980, 200);
  g.add(label);
  return g;
}

export function buildScaleRefs() {
  const root = new THREE.Group();
  root.name = "scaleRefs";

  const um100 = new THREE.Group();
  um100.add(squareYZ(100));
  const l100 = makeLabel("100 µm", 260);
  l100.position.set(0, 90, 0);
  um100.add(l100);
  um100.position.set(0, -300, -320);
  um100.userData.near = 220;
  um100.userData.far = 520;
  um100.visible = false;

  const mm = new THREE.Group();
  mm.add(micrometer());
  const cube = squareYZ(1000);
  cube.position.set(0, 500, 1500);
  mm.add(cube);
  const lmm = makeLabel("1 mm cube", 420);
  lmm.position.set(0, 1100, 1500);
  mm.add(lmm);
  mm.position.set(0, -390, -200);
  mm.userData.near = 450;
  mm.userData.far = 850;
  mm.visible = false;

  const fly = flyOutline();
  fly.position.set(0, -820, 260);
  fly.userData.near = 800;
  fly.userData.far = 1250;
  fly.visible = false;

  root.add(um100, mm, fly);
  return root;
}

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / Math.max(1e-6, b - a)));
  return t * t * (3 - 2 * t);
}

export function updateScaleRefs(group, camera, controls) {
  if (!group) return;
  const d = camera.position.distanceTo(controls.target);
  for (const child of group.children) {
    const fade = smoothstep(child.userData.near || 0, child.userData.far || 1, d);
    child.visible = fade > 0.03;
    child.traverse((obj) => {
      if (!obj.material || obj.material.opacity == null) return;
      const base = obj.userData.baseOpacity ?? child.userData.baseOpacity ?? 0.6;
      obj.material.opacity = base * fade;
    });
  }
}

export function buildCloud(neurons, strings, mode) {
  const soma = neurons.filter((n) => n.hasSoma);
  const positions = new Float32Array(soma.length * 3);
  const colors = new Float32Array(soma.length * 3);
  const indexOf = new Uint32Array(soma.length);
  for (let i = 0; i < soma.length; i++) {
    const n = soma[i];
    positions[i * 3] = n.x;
    positions[i * 3 + 1] = n.y;
    positions[i * 3 + 2] = n.z;
    const c = colorFor(mode, n, strings);
    colors[i * 3] = c[0];
    colors[i * 3 + 1] = c[1];
    colors[i * 3 + 2] = c[2];
    indexOf[i] = n.index;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 9,
    map: somaSprite(),
    vertexColors: true,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    alphaTest: 0.08,
  });
  const points = new THREE.Points(geo, mat);
  points.userData.soma = soma;
  points.userData.indexOf = indexOf;
  return points;
}

export function paintCloud(points, neurons, strings, mode, opts) {
  const { hidden = new Set(), focus = null, dimUnfocused = false, activity = null } = opts;
  const soma = points.userData.soma;
  const colors = points.geometry.attributes.color;
  for (let i = 0; i < soma.length; i++) {
    const n = soma[i];
    const sc = strings.superclass[n.superclass] || "";
    if (hidden.has(sc)) {
      colors.setXYZ(i, 0.05, 0.04, 0.03);
      continue;
    }
    let c = colorFor(mode, n, strings);
    if (activity) {
      const a = activity[i] || 0;
      const base = 0.07;
      c = [
        Math.min(1, c[0] * base + 1.0 * a),
        Math.min(1, c[1] * base + 0.78 * a),
        Math.min(1, c[2] * base + 0.28 * a),
      ];
    } else if (dimUnfocused && focus && !focus.has(n.id)) {
      c = [c[0] * 0.38, c[1] * 0.38, c[2] * 0.38];
    }
    colors.setXYZ(i, c[0], c[1], c[2]);
  }
  colors.needsUpdate = true;
}

const _pt = new THREE.Vector3();
const _closest = new THREE.Vector3();

function somaSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 30);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.35, "rgba(255,255,255,0.95)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

export function nearestSoma(ray, points, threshold = 10) {
  const pos = points.geometry.attributes.position;
  const soma = points.userData.soma;
  const origin = ray.origin;
  const dir = ray.direction;
  let best = -1;
  let bestD = threshold * threshold;
  for (let i = 0; i < soma.length; i++) {
    _pt.fromBufferAttribute(pos, i);
    const t = _pt.sub(origin).dot(dir);
    if (t < 0) continue;
    _closest.copy(origin).addScaledVector(dir, t);
    _pt.fromBufferAttribute(pos, i);
    const d = _closest.distanceToSquared(_pt);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best < 0 ? null : soma[best];
}

export function goCamera(camera, controls, name, cameras = CAMERAS) {
  const cue = cameras[name] || cameras.whole;
  camera.position.set(...cue.pos);
  controls.target.set(...cue.look);
  controls.update();
}

export function focusPose(neurons) {
  const pts = neurons.filter((n) => n && n.hasSoma);
  if (!pts.length) return null;
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  for (const n of pts) {
    box.expandByPoint(v.set(n.x, n.y, n.z));
  }
  const c = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const r = Math.max(size.x, size.y, size.z, 28);
  const dist = Math.max(r * 2.5, 80);
  const dir = new THREE.Vector3(1, 0.16, 0.1).normalize();
  return { pos: c.clone().addScaledVector(dir, dist), target: c, radius: r };
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - (Math.pow(-2 * t + 2, 2) / 2);
}

export function tweenTo(anim, camera, controls, pose, ms, instant) {
  if (!pose) return;
  if (instant) {
    camera.position.copy(pose.pos);
    controls.target.copy(pose.target);
    anim.active = false;
    return;
  }
  anim.active = true;
  anim.t0 = performance.now();
  anim.dur = ms;
  anim.fromPos = camera.position.clone();
  anim.fromTarget = controls.target.clone();
  anim.toPos = pose.pos.clone();
  anim.toTarget = pose.target.clone();
}

export function tickTween(anim, camera, controls, now) {
  if (!anim.active) return false;
  const u = Math.min(1, (now - anim.t0) / anim.dur);
  const e = easeInOut(u);
  camera.position.lerpVectors(anim.fromPos, anim.toPos, e);
  controls.target.lerpVectors(anim.fromTarget, anim.toTarget, e);
  if (u >= 1) anim.active = false;
  return true;
}

export function buildFocusCloud() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3), 3));
  geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(3), 3));
  const mat = new THREE.PointsMaterial({
    size: 15,
    map: somaSprite(),
    vertexColors: true,
    sizeAttenuation: true,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    alphaTest: 0.08,
  });
  const points = new THREE.Points(geo, mat);
  points.visible = false;
  return points;
}

export function updateFocusCloud(points, neurons, strings, mode) {
  if (!neurons.length) {
    points.visible = false;
    return;
  }
  const pos = new Float32Array(neurons.length * 3);
  const col = new Float32Array(neurons.length * 3);
  for (let i = 0; i < neurons.length; i++) {
    const n = neurons[i];
    pos[i * 3] = n.x;
    pos[i * 3 + 1] = n.y;
    pos[i * 3 + 2] = n.z;
    const c = colorFor(mode, n, strings);
    col[i * 3] = Math.min(1, c[0] * 1.25);
    col[i * 3 + 1] = Math.min(1, c[1] * 1.25);
    col[i * 3 + 2] = Math.min(1, c[2] * 1.25);
  }
  points.geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  points.geometry.setAttribute("color", new THREE.BufferAttribute(col, 3));
  points.geometry.computeBoundingSphere();
  points.visible = true;
}

const _chaseT = new THREE.Vector3();
const _chaseP = new THREE.Vector3();

export function chaseActivity(camera, controls, focus, dt) {
  if (!focus) return;
  _chaseT.set(focus.x, focus.y, focus.z);
  _chaseP.set(focus.x + 210, focus.y + 55, focus.z + 35);
  const a = 1 - Math.exp(-(dt || 0.016) * 2.4);
  camera.position.lerp(_chaseP, a);
  controls.target.lerp(_chaseT, a);
}

export function frameFocus(camera, controls, neurons) {
  const pose = focusPose(neurons);
  if (!pose) return;
  camera.position.copy(pose.pos);
  controls.target.copy(pose.target);
  controls.update();
}

export function camerasFromCloud(points) {
  points.geometry.computeBoundingBox();
  const b = points.geometry.boundingBox;
  const size = b.getSize(new THREE.Vector3());
  const c = b.getCenter(new THREE.Vector3());
  let long = "y";
  if (size.x >= size.y && size.x >= size.z) long = "x";
  else if (size.z >= size.y) long = "z";
  const L = Math.max(size.x, size.y, size.z);
  const off = L * 1.15;
  const side = L * 0.35;
  const coord = (n) => (long === "x" ? n.x : long === "z" ? n.z : n.y);
  const mid = long === "x" ? c.x : long === "z" ? c.z : c.y;
  let nLo = 0;
  let nHi = 0;
  for (const n of points.userData.soma || []) {
    if (coord(n) < mid) nLo += 1;
    else nHi += 1;
  }
  const brainSign = nLo >= nHi ? -1 : 1;
  const along = (sign) => {
    if (long === "x") return [c.x + sign * size.x * 0.28, c.y, c.z];
    if (long === "z") return [c.x, c.y, c.z + sign * size.z * 0.28];
    return [c.x, c.y + sign * size.y * 0.28, c.z];
  };
  const posAlong = (sign) => {
    const t = along(sign);
    if (long === "y") return [t[0] + side, t[1], t[2] + off * 0.25];
    if (long === "x") return [t[0], t[1] + side, t[2] + off * 0.25];
    return [t[0] + side, t[1] + off * 0.25, t[2]];
  };
  return {
    whole: { pos: [c.x + off, c.y, c.z], look: [c.x, c.y, c.z] },
    brain: { pos: posAlong(brainSign), look: along(brainSign) },
    vnc: { pos: posAlong(-brainSign), look: along(-brainSign) },
    optic: { pos: [c.x + off * 0.7, c.y, along(brainSign)[2]], look: along(brainSign) },
    courtship: { pos: posAlong(brainSign), look: along(brainSign) },
  };
}
