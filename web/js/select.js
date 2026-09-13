import * as THREE from "three";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { TOKENS } from "./palette.js";

function hexColor(hex) {
  return new THREE.Color(hex);
}

export function makeLace(positions) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0xd9c59a,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  return lines;
}

export function makeOverlay() {
  const edgeMat = new LineMaterial({
    vertexColors: true,
    linewidth: 2.4,
    transparent: true,
    opacity: 0.95,
    dashed: false,
    worldUnits: false,
  });
  const skelMat = new LineMaterial({
    color: TOKENS.ink,
    linewidth: 1.8,
    transparent: true,
    opacity: 0.95,
    dashed: false,
    worldUnits: false,
  });
  const edges = new LineSegments2(new LineSegmentsGeometry(), edgeMat);
  const skeletons = new LineSegments2(new LineSegmentsGeometry(), skelMat);
  edges.frustumCulled = false;
  skeletons.frustumCulled = false;
  edges.visible = false;
  skeletons.visible = false;
  return { edges, skeletons, edgeMat, skelMat };
}

export function setOverlayResolution(overlay, width, height) {
  overlay.edgeMat.resolution.set(width, height);
  overlay.skelMat.resolution.set(width, height);
}

export function setPartnerLines(overlay, selected, partners, byId) {
  if (!selected || !partners) {
    overlay.edges.visible = false;
    return;
  }
  const row = partners.rows.get(selected.id);
  if (!row) {
    overlay.edges.visible = false;
    return;
  }
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
  if (!pos.length) {
    overlay.edges.visible = false;
    return;
  }
  const geo = new LineSegmentsGeometry();
  geo.setPositions(pos);
  geo.setColors(col);
  overlay.edges.geometry.dispose();
  overlay.edges.geometry = geo;
  overlay.edges.visible = true;
}

export function setSkeletonFloats(overlay, floats) {
  if (!floats || floats.length < 6) {
    overlay.skeletons.visible = false;
    return;
  }
  const geo = new LineSegmentsGeometry();
  geo.setPositions(floats);
  overlay.skeletons.geometry.dispose();
  overlay.skeletons.geometry = geo;
  overlay.skeletons.visible = true;
}

export function setLaceDim(lace, dim) {
  if (!lace) return;
  lace.material.opacity = dim ? 0.16 : 0.4;
}

export function setFireLines(overlay, soma, sim, hot) {
  if (!hot || !hot.length) {
    overlay.edges.visible = false;
    return;
  }
  const pos = [];
  const col = [];
  const kOut = 15;
  for (const i of hot) {
    const a = soma[i];
    const e = sim.energy[i];
    const base = i * kOut;
    for (let k = 0; k < kOut; k++) {
      const j = sim.outI[base + k];
      if (j < 0) continue;
      const b = soma[j];
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      col.push(1, 0.82, 0.32, 0.95 * e, 0.45, 0.12);
    }
  }
  if (!pos.length) {
    overlay.edges.visible = false;
    return;
  }
  const geo = new LineSegmentsGeometry();
  geo.setPositions(pos);
  geo.setColors(col);
  overlay.edges.geometry.dispose();
  overlay.edges.geometry = geo;
  overlay.edges.visible = true;
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
