import * as THREE from "three";
import { TOKENS } from "./palette.js";

function hexColor(hex) {
  return new THREE.Color(hex);
}

export function makeOverlay() {
  const edges = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 })
  );
  const skeletons = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: TOKENS.ink, transparent: true, opacity: 0.7 })
  );
  return { edges, skeletons };
}

export function setPartnerLines(overlay, selected, partners, byId) {
  const geo = overlay.edges.geometry;
  if (!selected || !partners) {
    geo.setAttribute("position", new THREE.Float32BufferAttribute([], 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute([], 3));
    return;
  }
  const row = partners.rows.get(selected.id);
  if (!row) return;
  const pos = [];
  const col = [];
  const up = hexColor(TOKENS.up);
  const down = hexColor(TOKENS.down);
  const push = (otherId, color) => {
    const other = byId.get(otherId);
    if (!other || !other.hasSoma || !selected.hasSoma) return;
    pos.push(selected.x, selected.y, selected.z, other.x, other.y, other.z);
    col.push(color.r, color.g, color.b, color.r, color.g, color.b);
  };
  for (const id of row.inId) if (id) push(id, up);
  for (const id of row.outId) if (id) push(id, down);
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
}

export function setSkeletonLines(overlay, segmentsList) {
  const pos = [];
  for (const segs of segmentsList) {
    for (const p of segs) pos.push(p[0], p[1], p[2]);
  }
  overlay.skeletons.geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
}

export function partnerEntries(selected, partners, byId, strings) {
  if (!selected || !partners) return { up: [], down: [] };
  const row = partners.rows.get(selected.id);
  if (!row) return { up: [], down: [] };
  const map = (ids, weights) => {
    const out = [];
    for (let i = 0; i < ids.length; i++) {
      if (!ids[i]) continue;
      const n = byId.get(ids[i]);
      out.push({
        id: ids[i],
        weight: weights[i],
        type: n ? strings.type[n.type] || String(ids[i]) : String(ids[i]),
      });
    }
    return out;
  };
  return { up: map(row.inId, row.inW), down: map(row.outId, row.outW) };
}
