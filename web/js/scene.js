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
  scene.fog = new THREE.FogExp2(VOID, 0.00035);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 8000);
  camera.position.set(...CAMERAS.whole.pos);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.85;

  const stage = buildStage();
  scene.add(stage);

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  return { renderer, scene, camera, controls, resize, cameras: CAMERAS };
}

function buildStage() {
  const group = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color: 0x3a342c, transparent: true, opacity: 0.7 });
  const half = 220;
  const ticks = 11;
  const positions = [];
  for (let i = 0; i < ticks; i++) {
    const x = -half + (i * (2 * half)) / (ticks - 1);
    positions.push(x, -220, -half, x, -220, half);
    positions.push(-half, -220, x, half, -220, x);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  group.add(new THREE.LineSegments(geo, mat));
  return group;
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
  const { hidden = new Set(), focus = null, dimUnfocused = false } = opts;
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
    if (dimUnfocused && focus && !focus.has(n.id)) {
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

export function frameFocus(camera, controls, neurons) {
  const pts = neurons.filter((n) => n && n.hasSoma);
  if (!pts.length) return;
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
  camera.position.copy(c).addScaledVector(dir, dist);
  controls.target.copy(c);
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
