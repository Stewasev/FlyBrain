const RUNTIME = "/data/runtime";

export async function loadNeurons() {
  const resp = await fetch(`${RUNTIME}/neurons.json.gz`);
  if (!resp.ok) throw new Error(`neurons.json.gz ${resp.status}`);
  const ds = new DecompressionStream("gzip");
  const stream = resp.body.pipeThrough(ds);
  const text = await new Response(stream).text();
  const pack = JSON.parse(text);
  const neurons = [];
  const byId = new Map();
  for (let i = 0; i < pack.n; i++) {
    const n = {
      index: i,
      id: pack.id[i],
      x: pack.x[i],
      y: pack.y[i],
      z: pack.z[i],
      hasSoma: pack.hasSoma[i] === 1,
      type: pack.type[i],
      superclass: pack.superclass[i],
      class: pack.class[i],
      subclass: pack.subclass[i],
      side: pack.side[i],
      nt: pack.nt[i],
      dimorphism: pack.dimorphism[i],
      fruDsx: pack.fruDsx[i],
      wOut: pack.wOut[i],
      wIn: pack.wIn[i],
    };
    neurons.push(n);
    byId.set(n.id, n);
  }
  return { pack, neurons, byId, strings: pack.strings };
}

export async function loadPartners() {
  const resp = await fetch(`${RUNTIME}/partners.bin`);
  if (!resp.ok) throw new Error(`partners.bin ${resp.status}`);
  const buf = await resp.arrayBuffer();
  const view = new DataView(buf);
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (magic !== "MCNP") throw new Error(`bad partners magic ${magic}`);
  const n = view.getUint32(8, true);
  const kIn = view.getUint16(12, true);
  const kOut = view.getUint16(14, true);
  let offset = 16;
  const ids = new Array(n);
  for (let i = 0; i < n; i++, offset += 8) {
    ids[i] = Number(view.getBigInt64(offset, true));
  }
  const rows = new Map();
  for (let i = 0; i < n; i++) {
    const inId = new Array(kIn);
    const inW = new Array(kIn);
    const outId = new Array(kOut);
    const outW = new Array(kOut);
    for (let k = 0; k < kIn; k++, offset += 8) inId[k] = Number(view.getBigInt64(offset, true));
    for (let k = 0; k < kIn; k++, offset += 2) inW[k] = view.getUint16(offset, true);
    for (let k = 0; k < kOut; k++, offset += 8) outId[k] = Number(view.getBigInt64(offset, true));
    for (let k = 0; k < kOut; k++, offset += 2) outW[k] = view.getUint16(offset, true);
    rows.set(ids[i], { inId, inW, outId, outW });
  }
  return { n, kIn, kOut, rows };
}

export async function loadStories() {
  const names = ["courtship", "walking", "vision"];
  const stories = [];
  for (const name of names) {
    const resp = await fetch(`${RUNTIME}/stories/${name}.json`);
    if (!resp.ok) throw new Error(`${name}.json ${resp.status}`);
    stories.push(await resp.json());
  }
  return stories;
}

export async function loadLace() {
  const resp = await fetch(`${RUNTIME}/lace.bin`);
  if (!resp.ok) throw new Error(`lace.bin ${resp.status}`);
  const buf = await resp.arrayBuffer();
  const view = new DataView(buf);
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (magic !== "LACE") throw new Error(`bad lace magic ${magic}`);
  const nSeg = view.getUint32(8, true);
  return new Float32Array(buf, 12, nSeg * 6);
}

export async function loadSwc(bodyId) {
  const resp = await fetch(`${RUNTIME}/skeletons/${bodyId}.swc`);
  if (!resp.ok) return null;
  const text = await resp.text();
  const points = new Map();
  const links = [];
  for (const line of text.split("\n")) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    const p = s.split(/\s+/);
    if (p.length < 7) continue;
    const n = Number(p[0]);
    points.set(n, [Number(p[2]), Number(p[3]), Number(p[4])]);
    links.push([n, Number(p[6])]);
  }
  const segments = [];
  for (const [n, parent] of links) {
    if (parent < 0 || !points.has(parent) || !points.has(n)) continue;
    segments.push(points.get(parent), points.get(n));
  }
  return segments;
}
