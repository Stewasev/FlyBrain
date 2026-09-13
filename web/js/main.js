import * as THREE from "three";
import { legendFor } from "./palette.js";
import { arborFloats, loadLace, loadNeurons, loadPartners, loadStories } from "./load.js";
import {
  buildCloud,
  buildFocusCloud,
  camerasFromCloud,
  chaseActivity,
  createScene,
  focusPose,
  goCamera,
  nearestSoma,
  paintCloud,
  tickTween,
  tweenTo,
  updateFocusCloud,
  updateScaleRefs,
} from "./scene.js";
import {
  makeLace,
  makeOverlay,
  partnerEntries,
  setFireLines,
  setLaceDim,
  setOverlayResolution,
  setPartnerLines,
  setSkeletonFloats,
} from "./select.js";
import { parseHash, serializeHash } from "./hash.js";
import { activityFocus, createSim, hottest, LIVE_MODES, setSimMode, stepSim } from "./live.js";
import { neuronsOfType, searchCatalog } from "./search.js";
import { addScaleLights, fillScaleObjects } from "./scale-objects.js";
import { formatStep } from "./stories.js";

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.getElementById("view");
const boot = document.getElementById("boot");
const bootBar = document.getElementById("boot-bar");
const bootMsg = document.getElementById("boot-msg");
const inspectorEl = document.getElementById("inspector");
const legendEl = document.getElementById("legend");
const filtersEl = document.getElementById("filters");
const tourBtnsEl = document.getElementById("tour-btns");
const plate = document.getElementById("plate");
const playBtn = document.getElementById("play");
const hitsEl = document.getElementById("hits");
const searchEl = document.getElementById("search");
const copyBtn = document.getElementById("copy");
const embed = new URLSearchParams(window.location.search).get("embed") === "1";
if (embed) document.body.classList.add("embed");

const world = createScene(canvas);
const overlay = makeOverlay();
const focusCloud = buildFocusCloud();
const camAnim = { active: false, dur: 1400 };
world.scene.add(overlay.edges);
world.scene.add(overlay.skeletons);
world.scene.add(focusCloud);
addScaleLights(world.scene);
fillScaleObjects(world.scale).catch((err) => console.warn("scale objects", err));

const state = {
  pack: null,
  neurons: [],
  byId: new Map(),
  strings: null,
  partners: null,
  stories: [],
  lace: null,
  laceMesh: null,
  points: null,
  color: "superclass",
  hidden: new Set(),
  selected: null,
  typeName: null,
  tour: null,
  tourIndex: 0,
  playing: false,
  playAt: 0,
  idle: true,
  lastInput: performance.now(),
  live: false,
  liveMode: "vision",
  liveShuffle: true,
  liveShuffleAt: 0,
  sim: null,
  raycaster: new THREE.Raycaster(),
  mouse: new THREE.Vector2(),
};

function progress(label, pct) {
  bootMsg.textContent = label;
  bootBar.style.width = `${pct}%`;
}

function str(table, idx) {
  return state.strings[table][idx] || "—";
}

function renderLegend() {
  const items = legendFor(state.color, state.strings);
  legendEl.innerHTML = items
    .slice(0, 16)
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
  else if (state.typeName) {
    focus = new Set(neuronsOfType(state.neurons, state.strings, state.typeName).map((n) => n.id));
  } else if (state.selected) {
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
    dimUnfocused: Boolean(focus) && !state.live,
    activity: state.live && state.sim ? state.sim.energy : null,
  });
}

function renderInspector() {
  const n = state.selected;
  if (!n) {
    if (state.typeName) {
      const cells = neuronsOfType(state.neurons, state.strings, state.typeName);
      inspectorEl.textContent = `${state.typeName} · ${cells.length.toLocaleString()} somas`;
      return;
    }
    inspectorEl.textContent = state.tour ? "Touring. Click Exit to poke cells." : "Click a soma, or start a tour.";
    return;
  }
  const { up, down } = partnerEntries(n, state.partners, state.byId, state.strings);
  const li = (rows) =>
    rows
      .map((r) => `<li data-id="${r.id}"><span>${r.type}</span><span class="w">${r.weight}</span></li>`)
      .join("");
  inspectorEl.innerHTML = `
    <div class="id">${n.id}</div>
    <div>${str("type", n.type)}</div>
    <div>${str("superclass", n.superclass)} · ${str("nt", n.nt)}</div>
    <div>${str("dimorphism", n.dimorphism)} · ${str("fruDsx", n.fruDsx)}</div>
    <div>in ${n.wIn} · out ${n.wOut}</div>
    <h2>Upstream</h2>
    <ul class="partners">${li(up)}</ul>
    <h2>Downstream</h2>
    <ul class="partners">${li(down)}</ul>
  `;
}

function showArbors(ids) {
  if (!state.lace) {
    setSkeletonFloats(overlay, null);
    return;
  }
  setSkeletonFloats(overlay, arborFloats(state.lace, ids, 80));
}

function markTourButtons() {
  for (const b of tourBtnsEl.querySelectorAll("button")) {
    b.classList.toggle("active", Boolean(state.tour) && b.dataset.story === state.tour.id);
  }
  playBtn.classList.toggle("active", state.playing);
  playBtn.textContent = state.playing ? "Pause" : "Play";
}

function writeHash() {
  const next = serializeHash({
    tour: state.tour ? state.tour.id : null,
    step: state.tour ? state.tourIndex : null,
    id: state.selected ? state.selected.id : null,
    color: state.color,
    type: state.tour || state.live ? null : state.typeName,
    live: state.live ? state.liveMode : null,
  });
  const url = new URL(window.location.href);
  const want = next.replace(/^#/, "");
  if (url.hash.replace(/^#/, "") === want) return;
  url.hash = want;
  history.replaceState(null, "", url);
}

function applyHash(h) {
  if (h.color) {
    state.color = h.color;
    document.getElementById("color").value = h.color;
    renderLegend();
  }
  if (h.live) {
    startLive(h.live);
    return;
  }
  if (h.tour) {
    const story = state.stories.find((s) => s.id === h.tour);
    if (story) {
      state.tour = story;
      const max = story.steps.length - 1;
      state.tourIndex = Math.max(0, Math.min(max, h.step || 0));
      applyTour();
      return;
    }
  }
  if (h.type) {
    focusType(h.type);
    return;
  }
  if (h.id) {
    const n = state.byId.get(h.id);
    if (n) {
      selectNeuron(n);
      return;
    }
  }
  paint();
  writeHash();
}

function setPlate(view, focusedCount) {
  if (!view) {
    plate.hidden = true;
    return;
  }
  plate.hidden = false;
  const count = view.stainOnly ? "whole CNS" : `${focusedCount.toLocaleString()} cells`;
  document.getElementById("plate-kicker").textContent =
    `${view.story.title}  ·  ${view.index + 1} of ${view.story.steps.length}  ·  ${count}`;
  document.getElementById("plate-title").textContent = view.title;
  document.getElementById("plate-copy").textContent = view.narration;
  document.getElementById("plate-beats").innerHTML = view.story.steps
    .map((_, i) => `<li class="${i === view.index ? "on" : ""}"></li>`)
    .join("");
}

function flyTo(neurons) {
  const pose = focusPose(neurons);
  if (!pose) {
    goCamera(world.camera, world.controls, "whole", world.cameras);
    return;
  }
  tweenTo(camAnim, world.camera, world.controls, pose, 1400, reduced);
}

function applyTour() {
  if (!state.tour) {
    plate.hidden = true;
    setLaceDim(state.laceMesh, false);
    updateFocusCloud(focusCloud, [], state.strings, state.color);
    paint();
    return;
  }
  const view = formatStep(state.tour, state.tourIndex);
  state.color = view.color;
  state.selected = null;
  state.typeName = null;
  document.getElementById("color").value = view.color;
  renderLegend();
  const focused = view.focus
    ? [...view.focus].map((id) => state.byId.get(id)).filter((n) => n && n.hasSoma)
    : [];
  flyTo(focused.length ? focused : state.points.userData.soma);
  setPartnerLines(overlay, null, null, state.byId);
  setLaceDim(state.laceMesh, !view.stainOnly);
  updateFocusCloud(focusCloud, focused.slice(0, 4000), state.strings, state.color);
  setPlate(view, focused.length);
  renderInspector();
  markTourButtons();
  paint();
  showArbors(view.skeletonIds);
  state.playAt = performance.now();
  writeHash();
}

function exitTour() {
  state.tour = null;
  state.playing = false;
  plate.hidden = true;
  setLaceDim(state.laceMesh, false);
  updateFocusCloud(focusCloud, [], state.strings, state.color);
  markTourButtons();
  selectNeuron(null);
}

function showTab(name) {
  const tours = name === "tours";
  document.getElementById("tab-tours").classList.toggle("active", tours);
  document.getElementById("tab-live").classList.toggle("active", !tours);
  document.getElementById("panel-tours").hidden = !tours;
  document.getElementById("panel-live").hidden = tours;
}

function setLivePlate() {
  const mode = LIVE_MODES.find((m) => m.id === state.liveMode) || LIVE_MODES[0];
  plate.hidden = false;
  document.getElementById("plate-kicker").textContent = "Live · simulated spikes";
  document.getElementById("plate-title").textContent = mode.title;
  document.getElementById("plate-copy").textContent = mode.narration;
  document.getElementById("plate-beats").innerHTML = LIVE_MODES.map(
    (m) => `<li class="${m.id === state.liveMode ? "on" : ""}"></li>`
  ).join("");
  for (const b of document.querySelectorAll("#live-modes button")) {
    b.classList.toggle("active", b.dataset.mode === state.liveMode);
  }
}

function ensureSim() {
  if (!state.sim) state.sim = createSim(state.points.userData.soma, state.partners);
}

function startLive(mode = "vision") {
  const spec = LIVE_MODES.find((m) => m.id === mode) || LIVE_MODES[1];
  state.live = true;
  state.liveMode = spec.id;
  state.tour = null;
  state.playing = false;
  state.selected = null;
  state.typeName = null;
  hitsEl.hidden = true;
  showTab("live");
  ensureSim();
  setSimMode(state.sim, state.neurons, state.strings, spec.id);
  state.sim.energy.fill(0);
  state.liveShuffleAt = performance.now();
  markTourButtons();
  setPartnerLines(overlay, null, null, state.byId);
  if (state.laceMesh) state.laceMesh.material.opacity = 0.08;
  updateFocusCloud(focusCloud, [], state.strings, state.color);
  setLivePlate();
  paint();
  writeHash();
}

function stopLive() {
  if (!state.live) return;
  state.live = false;
  if (state.sim) state.sim.energy.fill(0);
  showTab("tours");
  plate.hidden = true;
  setLaceDim(state.laceMesh, false);
  overlay.edges.visible = false;
  paint();
  writeHash();
}

function startTour(id, index = 0) {
  stopLive();
  state.typeName = null;
  hitsEl.hidden = true;
  showTab("tours");
  state.tour = state.stories.find((s) => s.id === id) || state.stories[0];
  state.tourIndex = index;
  applyTour();
}

function stepTour(delta) {
  if (!state.tour) return;
  const n = state.tour.steps.length;
  state.tourIndex = (state.tourIndex + delta + n) % n;
  applyTour();
}

function togglePlay() {
  if (!state.tour) startTour("courtship");
  state.playing = !state.playing;
  state.playAt = performance.now();
  markTourButtons();
}

function selectNeuron(n) {
  state.selected = n;
  if (n) {
    state.tour = null;
    state.typeName = null;
    state.playing = false;
    plate.hidden = true;
    hitsEl.hidden = true;
    markTourButtons();
    setLaceDim(state.laceMesh, true);
    updateFocusCloud(focusCloud, [n], state.strings, state.color);
  } else {
    setLaceDim(state.laceMesh, false);
    updateFocusCloud(focusCloud, [], state.strings, state.color);
  }
  setPartnerLines(overlay, n, state.partners, state.byId);
  paint();
  renderInspector();
  showArbors(n ? [n.id] : []);
  writeHash();
}

function renderHits(result) {
  if (result.exact) {
    hitsEl.hidden = true;
    selectNeuron(result.exact);
    return;
  }
  if (!result.types.length) {
    hitsEl.innerHTML = `<li class="empty">No types match.</li>`;
    hitsEl.hidden = false;
    return;
  }
  hitsEl.innerHTML = result.types
    .map(
      (t) =>
        `<li data-type="${t.type.replace(/"/g, "")}" tabindex="0"><span>${t.type}</span><span class="n">${t.soma}</span></li>`
    )
    .join("");
  hitsEl.hidden = false;
}

function focusType(typeName) {
  const cells = neuronsOfType(state.neurons, state.strings, typeName);
  if (!cells.length) return;
  state.tour = null;
  state.playing = false;
  state.selected = null;
  state.typeName = typeName;
  plate.hidden = true;
  hitsEl.hidden = true;
  markTourButtons();
  flyTo(cells);
  setPartnerLines(overlay, null, null, state.byId);
  setLaceDim(state.laceMesh, true);
  updateFocusCloud(focusCloud, cells.slice(0, 4000), state.strings, state.color);
  paint();
  renderInspector();
  showArbors(cells.slice(0, 80).map((n) => n.id));
  writeHash();
}

function search(q) {
  const result = searchCatalog(state.neurons, state.strings, q);
  renderHits(result);
}

function bumpInput() {
  state.lastInput = performance.now();
  state.idle = false;
}

canvas.addEventListener("pointerdown", (ev) => {
  bumpInput();
  if (ev.button !== 0) return;
  const rect = canvas.getBoundingClientRect();
  state.mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  state.mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  state.raycaster.setFromCamera(state.mouse, world.camera);
  const hit = nearestSoma(state.raycaster.ray, state.points, 12);
  if (hit) selectNeuron(hit);
});
canvas.addEventListener("wheel", bumpInput, { passive: true });
canvas.addEventListener("pointermove", (ev) => {
  if (ev.buttons) bumpInput();
});

searchEl.addEventListener("input", () => {
  const q = searchEl.value.trim();
  if (!q) {
    hitsEl.hidden = true;
    return;
  }
  search(q);
});
searchEl.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") {
    const first = hitsEl.querySelector("li[data-type]");
    if (first) focusType(first.dataset.type);
    else search(searchEl.value);
  } else if (ev.key === "Escape") {
    hitsEl.hidden = true;
    searchEl.blur();
    ev.stopPropagation();
  }
});
hitsEl.addEventListener("click", (ev) => {
  const li = ev.target.closest("li[data-type]");
  if (li) focusType(li.dataset.type);
});
document.getElementById("color").addEventListener("change", (ev) => {
  state.color = ev.target.value;
  renderLegend();
  paint();
  if (state.tour) applyTour();
  else writeHash();
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
document.getElementById("prev").addEventListener("click", () => stepTour(-1));
document.getElementById("next").addEventListener("click", () => stepTour(1));
document.getElementById("clear").addEventListener("click", exitTour);
playBtn.addEventListener("click", togglePlay);
document.getElementById("tab-tours").addEventListener("click", () => {
  stopLive();
  writeHash();
});
document.getElementById("tab-live").addEventListener("click", () => startLive(state.liveMode));
copyBtn.addEventListener("click", async () => {
  writeHash();
  const url = window.location.href;
  try {
    await navigator.clipboard.writeText(url);
    copyBtn.textContent = "Copied";
  } catch {
    window.prompt("Copy this link", url);
    copyBtn.textContent = "Copy link";
    return;
  }
  setTimeout(() => {
    copyBtn.textContent = "Copy link";
  }, 1400);
});

window.addEventListener("keydown", (ev) => {
  if (ev.target && ["INPUT", "SELECT", "TEXTAREA"].includes(ev.target.tagName)) return;
  if (ev.key === " ") {
    ev.preventDefault();
    if (state.live) state.liveShuffle = !state.liveShuffle;
    else togglePlay();
  } else if (ev.key === "ArrowRight") stepTour(1);
  else if (ev.key === "ArrowLeft") stepTour(-1);
  else if (ev.key === "Escape") {
    if (state.live) stopLive();
    else exitTour();
  }
  else if (ev.key === "1") startTour("courtship");
  else if (ev.key === "2") startTour("walking");
  else if (ev.key === "3") startTour("vision");
  else if (ev.key === "4") startTour("dimorphism");
  else if (ev.key === "l" || ev.key === "L" || ev.key === "5") startLive(state.liveMode || "vision");
  else if (ev.key === "/") {
    ev.preventDefault();
    document.getElementById("search").focus();
  }
});

function tickScale() {
  const el = document.getElementById("scale");
  const bar = el.querySelector("i");
  const dist = world.camera.position.distanceTo(world.controls.target);
  const fov = (world.camera.fov * Math.PI) / 180;
  const worldH = 2 * Math.tan(fov / 2) * dist;
  const umPerPx = worldH / Math.max(canvas.clientHeight, 1);
  const nice = [10, 20, 50, 100, 200, 500];
  const target = 80 * umPerPx;
  const um = nice.reduce((best, v) => (Math.abs(v - target) < Math.abs(best - target) ? v : best), nice[0]);
  bar.style.width = `${Math.max(24, um / umPerPx)}px`;
  document.getElementById("scale-label").textContent = `${um} µm`;
}

function tick(now) {
  setOverlayResolution(overlay, canvas.clientWidth, canvas.clientHeight);
  const tweening = tickTween(camAnim, world.camera, world.controls, now);
  if (state.playing && state.tour && now - state.playAt > 5500) stepTour(1);
  if (state.live && state.sim) {
    stepSim(state.sim, now);
    const soma = state.points.userData.soma;
    const hot = hottest(state.sim.energy, 32, 0.2);
    const sparks = hot.filter((i) => state.sim.energy[i] > 0.35).map((i) => soma[i]);
    updateFocusCloud(focusCloud, sparks, state.strings, state.color);
    setFireLines(overlay, soma, state.sim, hot);
    const focus = activityFocus(soma, state.sim.energy);
    if (focus && !tweening) chaseActivity(world.camera, world.controls, focus, 0.016);
    paint();
    if (state.liveShuffle && now - state.liveShuffleAt > 14000) {
      const i = LIVE_MODES.findIndex((m) => m.id === state.liveMode);
      const next = LIVE_MODES[(i + 1) % LIVE_MODES.length];
      state.liveMode = next.id;
      setSimMode(state.sim, state.neurons, state.strings, next.id);
      state.liveShuffleAt = now;
      setLivePlate();
      writeHash();
    }
  }
  if (!state.live && !reduced && !tweening && now - state.lastInput > 4000) {
    const tgt = world.controls.target;
    const p = world.camera.position;
    const dx = p.x - tgt.x;
    const dz = p.z - tgt.z;
    const r = Math.hypot(dx, dz);
    if (r > 1) {
      const ang = Math.atan2(dz, dx) + 0.001;
      world.camera.position.x = tgt.x + Math.cos(ang) * r;
      world.camera.position.z = tgt.z + Math.sin(ang) * r;
    }
  }
  if (!reduced && focusCloud.visible) {
    focusCloud.material.size = 13 + Math.sin(now * 0.003) * 2.5;
  }
  updateScaleRefs(world.scale, world.camera, world.controls);
  world.controls.update();
  world.renderer.render(world.scene, world.camera);
  tickScale();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

try {
  progress("neurons", 15);
  const neuronsP = loadNeurons();
  progress("connectome", 40);
  const partnersP = loadPartners();
  const storiesP = loadStories();
  progress("arbors", 70);
  const laceP = loadLace().catch((err) => {
    console.warn(err);
    return { positions: new Float32Array(), byId: new Map() };
  });
  const [{ pack, neurons, byId, strings }, partners, stories, lace] = await Promise.all([
    neuronsP,
    partnersP,
    storiesP,
    laceP,
  ]);
  progress("drawing", 92);
  state.pack = pack;
  state.neurons = neurons;
  state.byId = byId;
  state.strings = strings;
  state.partners = partners;
  state.stories = stories;
  state.lace = lace;
  state.points = buildCloud(neurons, strings, state.color);
  world.scene.add(state.points);
  if (lace.positions.length) {
    state.laceMesh = makeLace(lace.positions);
    world.scene.add(state.laceMesh);
  }
  world.cameras = camerasFromCloud(state.points);
  window.addEventListener("hashchange", () => applyHash(parseHash(window.location.hash)));
  const initial = parseHash(window.location.hash);
  if (initial.tour || initial.id || initial.type || initial.live) {
    applyHash(initial);
  } else {
    if (initial.color) {
      state.color = initial.color;
      document.getElementById("color").value = initial.color;
    }
    const intro = focusPose(state.points.userData.soma);
    if (intro) {
      world.camera.position.copy(intro.pos).multiplyScalar(1.35);
      world.controls.target.copy(intro.target);
      tweenTo(camAnim, world.camera, world.controls, intro, 2200, reduced);
    }
    writeHash();
  }
  renderLegend();
  renderFilters();
  document.getElementById("live-modes").innerHTML = LIVE_MODES.map(
    (m) => `<button type="button" data-mode="${m.id}">${m.title}</button>`
  ).join("");
  document.getElementById("live-modes").addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-mode]");
    if (!btn) return;
    state.liveShuffle = false;
    startLive(btn.dataset.mode);
  });
  tourBtnsEl.innerHTML = stories
    .map((s, i) => `<button type="button" data-story="${s.id}">${i + 1} ${s.title}</button>`)
    .join("");
  tourBtnsEl.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button");
    if (!btn) return;
    startTour(btn.dataset.story);
  });
  progress("ready", 100);
  requestAnimationFrame(() => boot.classList.add("gone"));
} catch (err) {
  bootMsg.textContent = err.message;
  console.error(err);
}
