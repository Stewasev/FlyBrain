import * as THREE from "three";
import { legendFor } from "./palette.js";
import { loadLace, loadNeurons, loadPartners, loadStories, loadSwc } from "./load.js";
import {
  buildCloud,
  camerasFromCloud,
  createScene,
  goCamera,
  nearestSoma,
  paintCloud,
} from "./scene.js";
import {
  makeLace,
  makeOverlay,
  partnerEntries,
  setOverlayResolution,
  setPartnerLines,
  setSkeletonLines,
} from "./select.js";
import { formatStep } from "./stories.js";

const canvas = document.getElementById("view");
const statusEl = document.getElementById("status");
const legendEl = document.getElementById("legend");
const filtersEl = document.getElementById("filters");
const inspectorEl = document.getElementById("inspector");
const narrationEl = document.getElementById("narration");
const tourBtnsEl = document.getElementById("tour-btns");

const world = createScene(canvas);
const overlay = makeOverlay();
world.scene.add(overlay.edges);
world.scene.add(overlay.skeletons);

const state = {
  pack: null,
  neurons: [],
  byId: new Map(),
  strings: null,
  partners: null,
  stories: [],
  points: null,
  color: "superclass",
  hidden: new Set(),
  selected: null,
  tour: null,
  tourIndex: 0,
  raycaster: new THREE.Raycaster(),
  mouse: new THREE.Vector2(),
};

function setStatus(text) {
  statusEl.textContent = text;
}

function renderLegend() {
  const items = legendFor(state.color, state.strings);
  legendEl.innerHTML = items
    .slice(0, 18)
    .map((it) => `<div><span class="swatch" style="background:${it.color}"></span>${it.label}</div>`)
    .join("");
}

function renderFilters() {
  const names = [...new Set(state.strings.superclass.filter(Boolean))].sort();
  filtersEl.innerHTML = names
    .map((n) => {
      const on = !state.hidden.has(n);
      return `<span class="chip ${on ? "on" : ""}" data-sc="${n}">${n}</span>`;
    })
    .join("");
}

function paint() {
  if (!state.points) return;
  const tour = state.tour ? formatStep(state.tour, state.tourIndex) : null;
  let focus = null;
  if (tour) focus = tour.focus;
  else if (state.selected) {
    focus = new Set([state.selected.id]);
    const row = state.partners?.rows.get(state.selected.id);
    if (row) {
      for (const id of row.inId) if (id) focus.add(id);
      for (const id of row.outId) if (id) focus.add(id);
    }
  }
  paintCloud(state.points, state.neurons, state.strings, state.color, {
    hidden: state.hidden,
    focus,
    dimUnfocused: Boolean(focus),
  });
}

function str(table, idx) {
  return state.strings[table][idx] || "—";
}

function renderInspector() {
  const n = state.selected;
  if (!n) {
    inspectorEl.textContent = "No cell selected.";
    return;
  }
  const { up, down } = partnerEntries(n, state.partners, state.byId, state.strings);
  const li = (rows) =>
    rows
      .map(
        (r) =>
          `<li data-id="${r.id}"><span>${r.type}</span><span class="w">${r.weight}</span></li>`
      )
      .join("");
  inspectorEl.innerHTML = `
    <div class="id">${n.id}</div>
    <div>${str("type", n.type)}</div>
    <div>${str("superclass", n.superclass)} · ${str("nt", n.nt)}</div>
    <div>${str("dimorphism", n.dimorphism)} · ${str("fruDsx", n.fruDsx)}</div>
    <div>in ${n.wIn} · out ${n.wOut}</div>
    <h2>Upstream</h2>
    <ul class="partners" id="up">${li(up)}</ul>
    <h2>Downstream</h2>
    <ul class="partners" id="down">${li(down)}</ul>
  `;
}

async function showSkeletons(ids) {
  const segs = [];
  for (const id of ids.slice(0, 80)) {
    const s = await loadSwc(id);
    if (s && s.length) segs.push(s);
  }
  setSkeletonLines(overlay, segs);
}

async function selectNeuron(n, { fromTour = false } = {}) {
  state.selected = n;
  if (!fromTour) {
    state.tour = null;
  }
  setPartnerLines(overlay, n, state.partners, state.byId);
  paint();
  renderInspector();
  if (n) {
    setStatus(`${n.id}  ${str("type", n.type)}`);
    await showSkeletons([n.id]);
  } else {
    setSkeletonLines(overlay, []);
    setStatus(`${state.pack.n.toLocaleString()} traced · ${state.points.userData.soma.length.toLocaleString()} somas`);
  }
}

function applyTour() {
  if (!state.tour) {
    narrationEl.textContent = "Click a soma. Upstream edges stain cyan, downstream gold.";
    paint();
    return;
  }
  const view = formatStep(state.tour, state.tourIndex);
  state.color = view.color;
  document.getElementById("color").value = view.color;
  renderLegend();
  narrationEl.textContent = `${view.label} — ${view.title}. ${view.narration}`;
  goCamera(world.camera, world.controls, view.camera, world.cameras);
  const first = [...view.focus].map((id) => state.byId.get(id)).find((n) => n && n.hasSoma);
  if (first) {
    selectNeuron(first, { fromTour: true });
  } else {
    state.selected = null;
    setPartnerLines(overlay, null, null, state.byId);
    renderInspector();
  }
  paint();
  showSkeletons(view.skeletonIds);
}

function search(q) {
  q = q.trim();
  if (!q) return;
  if (/^\d+$/.test(q)) {
    const n = state.byId.get(Number(q));
    if (n) selectNeuron(n);
    else setStatus(`no body ${q}`);
    return;
  }
  const ql = q.toLowerCase();
  const hit = state.neurons.find((n) => n.hasSoma && (state.strings.type[n.type] || "").toLowerCase().includes(ql));
  if (hit) selectNeuron(hit);
  else setStatus(`no type matching ${q}`);
}

canvas.addEventListener("pointerdown", (ev) => {
  if (ev.button !== 0) return;
  const rect = canvas.getBoundingClientRect();
  state.mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  state.mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  state.raycaster.setFromCamera(state.mouse, world.camera);
  const hit = nearestSoma(state.raycaster.ray, state.points, 12);
  if (hit) selectNeuron(hit);
});

document.getElementById("search").addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") search(ev.target.value);
});
document.getElementById("color").addEventListener("change", (ev) => {
  state.color = ev.target.value;
  renderLegend();
  paint();
});
filtersEl.addEventListener("click", (ev) => {
  const chip = ev.target.closest(".chip");
  if (!chip) return;
  const name = chip.dataset.sc;
  if (state.hidden.has(name)) state.hidden.delete(name);
  else state.hidden.add(name);
  renderFilters();
  paint();
});
inspectorEl.addEventListener("click", (ev) => {
  const li = ev.target.closest("li[data-id]");
  if (!li) return;
  const n = state.byId.get(Number(li.dataset.id));
  if (n) selectNeuron(n);
});
document.getElementById("prev").addEventListener("click", () => {
  if (!state.tour) return;
  state.tourIndex = (state.tourIndex + state.tour.steps.length - 1) % state.tour.steps.length;
  applyTour();
});
document.getElementById("next").addEventListener("click", () => {
  if (!state.tour) return;
  state.tourIndex = (state.tourIndex + 1) % state.tour.steps.length;
  applyTour();
});
document.getElementById("clear").addEventListener("click", () => {
  state.tour = null;
  selectNeuron(null);
  narrationEl.textContent = "Click a soma. Upstream edges stain cyan, downstream gold.";
});

function tick() {
  setOverlayResolution(overlay, canvas.clientWidth, canvas.clientHeight);
  world.controls.update();
  world.renderer.render(world.scene, world.camera);
  requestAnimationFrame(tick);
}
tick();

try {
  const [{ pack, neurons, byId, strings }, partners, stories, lacePos] = await Promise.all([
    loadNeurons(),
    loadPartners(),
    loadStories(),
    loadLace().catch((err) => {
      console.warn(err);
      return new Float32Array();
    }),
  ]);
  state.pack = pack;
  state.neurons = neurons;
  state.byId = byId;
  state.strings = strings;
  state.partners = partners;
  state.stories = stories;
  state.points = buildCloud(neurons, strings, state.color);
  world.scene.add(state.points);
  if (lacePos.length) world.scene.add(makeLace(lacePos));
  world.cameras = camerasFromCloud(state.points);
  goCamera(world.camera, world.controls, "whole", world.cameras);
  renderLegend();
  renderFilters();
  tourBtnsEl.innerHTML = stories
    .map((s) => `<button type="button" data-story="${s.id}">${s.title}</button>`)
    .join("");
  tourBtnsEl.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button");
    if (!btn) return;
    state.tour = stories.find((s) => s.id === btn.dataset.story);
    state.tourIndex = 0;
    applyTour();
  });
  setStatus(`${pack.n.toLocaleString()} traced · ${state.points.userData.soma.length.toLocaleString()} somas`);
} catch (err) {
  setStatus(err.message);
  console.error(err);
}
