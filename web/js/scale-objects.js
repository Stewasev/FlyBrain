import * as THREE from "three";

const UM = 1000; // 1 mm in scene units

function loadTex(url) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        resolve(t);
      },
      undefined,
      reject
    );
  });
}

function labelSprite(text, width) {
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 128;
  const g = c.getContext("2d");
  g.clearRect(0, 0, 768, 128);
  g.font = "700 56px 'Fragment Mono', ui-monospace, monospace";
  g.fillStyle = "#f0e6d0";
  g.strokeStyle = "#100e0c";
  g.lineWidth = 8;
  g.textBaseline = "middle";
  g.strokeText(text, 16, 64);
  g.fillText(text, 16, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  s.scale.set(width, width * (128 / 768), 1);
  s.userData.baseOpacity = 0.95;
  return s;
}

function reedTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 8;
  const g = c.getContext("2d");
  g.fillStyle = "#9aa0a6";
  g.fillRect(0, 0, 64, 8);
  g.fillStyle = "#6d7378";
  for (let x = 0; x < 64; x += 2) g.fillRect(x, 0, 1, 8);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(48, 1);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeCoin(obverse, reverse, diameterMm, thickMm) {
  const r = (diameterMm / 2) * UM;
  const h = thickMm * UM;
  const group = new THREE.Group();
  const sideMat = new THREE.MeshStandardMaterial({
    map: reedTexture(),
    metalness: 0.85,
    roughness: 0.35,
    color: 0xc5c8cc,
  });
  const obMat = new THREE.MeshStandardMaterial({
    map: obverse,
    metalness: 0.55,
    roughness: 0.28,
  });
  const reMat = new THREE.MeshStandardMaterial({
    map: reverse,
    metalness: 0.55,
    roughness: 0.28,
  });
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 96, 1, true), sideMat);
  const cap = new THREE.CircleGeometry(r, 96);
  const front = new THREE.Mesh(cap, obMat);
  const back = new THREE.Mesh(cap.clone(), reMat);
  front.rotation.x = -Math.PI / 2;
  front.position.y = h / 2 + 0.4;
  back.rotation.x = Math.PI / 2;
  back.position.y = -h / 2 - 0.4;
  group.add(cyl, front, back);
  group.rotation.z = Math.PI / 2;
  return group;
}

function makeHair() {
  const pts = [];
  const len = 2500;
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    pts.push(new THREE.Vector3(Math.sin(t * 2.2) * 25, Math.sin(t * 3.1) * 18, t * len));
  }
  const mat = new THREE.MeshStandardMaterial({
    color: 0x3a2418,
    roughness: 0.45,
    metalness: 0.05,
  });
  return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 35, 8, false), mat);
}

function makePaperclip() {
  const g = new THREE.Group();
  const wire = 500;
  const pts = [];
  const path = [
    [0, 0, 0],
    [0, 0, 28000],
    [0, 3500, 33000],
    [0, 7000, 28000],
    [0, 7000, 2000],
    [0, 3500, -2000],
    [0, 0, 3000],
    [0, 0, 24000],
  ];
  for (const p of path) pts.push(new THREE.Vector3(p[0], p[1], p[2]));
  const curve = new THREE.CatmullRomCurve3(pts);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xc0c4c8,
    metalness: 0.9,
    roughness: 0.25,
  });
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, wire, 8, false), mat));
  return g;
}

function makeHouseFly() {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.7, metalness: 0.15 });
  const eye = new THREE.MeshStandardMaterial({ color: 0x8a1c14, roughness: 0.35, metalness: 0.05 });
  const wing = new THREE.MeshStandardMaterial({
    color: 0xd8dce0,
    roughness: 0.2,
    metalness: 0.05,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const thorax = new THREE.Mesh(new THREE.SphereGeometry(900, 16, 12), body);
  thorax.scale.set(1.1, 0.95, 1.15);
  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(800, 16, 12), body);
  abdomen.position.z = 1600;
  abdomen.scale.set(0.95, 0.85, 1.7);
  const head = new THREE.Mesh(new THREE.SphereGeometry(700, 14, 12), body);
  head.position.z = -1100;
  head.scale.set(1, 0.9, 0.95);
  const e1 = new THREE.Mesh(new THREE.SphereGeometry(380, 12, 10), eye);
  e1.position.set(420, 120, -1250);
  const e2 = e1.clone();
  e2.position.x = -420;
  const w1 = new THREE.Mesh(new THREE.PlaneGeometry(4200, 1800), wing);
  w1.position.set(900, 500, 200);
  w1.rotation.set(-0.85, 0.2, 0.45);
  const w2 = w1.clone();
  w2.position.x = -900;
  w2.rotation.z = -0.45;
  g.add(thorax, abdomen, head, e1, e2, w1, w2);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
  for (const z of [-400, 0, 500]) {
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(45, 35, 1800, 5), legMat);
      leg.position.set(side * 500, -900, z);
      leg.rotation.z = side * 0.55;
      leg.rotation.x = 0.35;
      g.add(leg);
    }
  }
  return g;
}

function wrap(obj, near, far, label, labelWidth, labelPos) {
  const g = new THREE.Group();
  g.add(obj);
  if (label) {
    const s = labelSprite(label, labelWidth);
    s.position.copy(labelPos);
    g.add(s);
  }
  g.userData.near = near;
  g.userData.far = far;
  g.visible = false;
  g.traverse((o) => {
    if (o.isMesh && o.material) o.userData.baseOpacity = o.material.opacity ?? 1;
  });
  return g;
}

export async function fillScaleObjects(root) {
  const models = new URL("../models/", import.meta.url);
  const [dOb, dRe, qOb, qRe] = await Promise.all([
    loadTex(new URL("dime-obverse.png", models).href),
    loadTex(new URL("dime-reverse.png", models).href),
    loadTex(new URL("quarter-obverse.png", models).href),
    loadTex(new URL("quarter-reverse.png", models).href),
  ]);

  const hair = wrap(makeHair(), 120, 400, "human hair  ~70 µm", 1200, new THREE.Vector3(0, 180, 1250));
  hair.position.set(0, -420, -2200);

  const fly = wrap(makeHouseFly(), 1500, 2800, "house fly  ~7 mm", 2800, new THREE.Vector3(0, 2800, 0));
  fly.position.set(0, -900, 6500);

  const dime = wrap(
    makeCoin(dOb, dRe, 17.91, 1.35),
    4000,
    7000,
    "dime  17.9 mm",
    3200,
    new THREE.Vector3(0, 11000, 0)
  );
  dime.position.set(0, 0, 22000);

  const quarter = wrap(
    makeCoin(qOb, qRe, 24.26, 1.75),
    8000,
    13000,
    "quarter  24.3 mm",
    4000,
    new THREE.Vector3(0, 14500, 0)
  );
  quarter.position.set(0, 0, 50000);

  const clip = wrap(makePaperclip(), 14000, 22000, "paperclip  ~33 mm", 4800, new THREE.Vector3(0, 8000, 16500));
  clip.position.set(0, -4000, 78000);

  root.add(hair, fly, dime, quarter, clip);
}

export function addScaleLights(scene) {
  scene.add(new THREE.AmbientLight(0xb8c0c8, 0.55));
  const key = new THREE.DirectionalLight(0xfff3e0, 1.35);
  key.position.set(2400, 1800, 800);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x8899aa, 0.4);
  fill.position.set(-1200, 400, -600);
  scene.add(fill);
}
