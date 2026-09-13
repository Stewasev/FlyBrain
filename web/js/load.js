export const RUNTIME = new URL("../../data/runtime/", import.meta.url).href;

async function fetchOk(path) {
  const resp = await fetch(new URL(path, RUNTIME));
  if (!resp.ok) throw new Error(`${path} ${resp.status}`);
  return resp;
}

export async function loadNeurons(onProgress) {
  onProgress?.("neurons");
  const resp = await fetchOk("neurons.json.gz");
  const ds = new DecompressionStream("gzip");
  const text = await new Response(resp.body.pipeThrough(ds)).text();
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

export async function loadPartners(onProgress) {
  onProgress?.("connectome");
  const resp = await fetchOk("partners.bin");
  const buf = await resp.arrayBuffer();
  const view = new DataView(buf);
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (magic !== "MCNP") throw new Error(`bad partners magic ${magic}`);
  const n = view.getUint32(8, true);
  const kIn = view.getUint16(12, true);
  const kOut = view.getUint16(14, true);
  let offset = 16;
  const ids = new Array(n);
  for (let i = 0; i < n; i++, offset += 8) ids[i] = Number(view.getBigInt64(offset, true));
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
    const resp = await fetchOk(`stories/${name}.json`);
    stories.push(await resp.json());
  }
  return stories;
}

export async function loadLace(onProgress) {
  onProgress?.("arbors");
  const resp = await fetchOk("lace.bin");
  const buf = await resp.arrayBuffer();
  const view = new DataView(buf);
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (magic !== "LACE") throw new Error(`bad lace magic ${magic}`);
  const version = view.getUint32(4, true);
  if (version === 1) {
    const nSeg = view.getUint32(8, true);
    return { positions: new Float32Array(buf, 12, nSeg * 6), byId: new Map() };
  }
  const nBodies = view.getUint32(8, true);
  const nSeg = view.getUint32(12, true);
  let offset = 16;
  const byId = new Map();
  for (let i = 0; i < nBodies; i++) {
    const id = Number(view.getBigInt64(offset, true));
    const first = view.getUint32(offset + 8, true);
    const n = view.getUint32(offset + 12, true);
    byId.set(id, { first, n });
    offset += 16;
  }
  return { positions: new Float32Array(buf, offset, nSeg * 6), byId };
}

export function arborFloats(lace, bodyIds, cap = 80) {
  const parts = [];
  let total = 0;
  for (const id of bodyIds.slice(0, cap)) {
    const rec = lace.byId.get(id);
    if (!rec || !rec.n) continue;
    parts.push(lace.positions.subarray(rec.first * 6, (rec.first + rec.n) * 6));
    total += rec.n * 6;
  }
  const out = new Float32Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
