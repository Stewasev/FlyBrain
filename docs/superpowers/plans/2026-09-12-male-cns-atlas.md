# Male CNS Atlas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bake the Male CNS v1.0 Feather tables into a runtime pack and ship a static 3D atlas (browser + Blender) with courtship, walking, and vision tours.

**Architecture:** `atlas/` is a pure Python library: convert coordinates, intern labels, select traced neurons, compute top-15 partners, write `neurons.json.gz` + `partners.bin`, copy stories, optionally fetch SWCs. `web/` is a no-bundler Three.js page that loads that pack. `blender/import_atlas.py` reads the same pack into collection `MaleCNS`.

**Tech Stack:** Python 3.10, pyarrow, pytest; browser: Three.js r170 via importmap; Blender 4.x bpy.

**Spec:** `docs/superpowers/specs/2026-09-12-male-cns-atlas-design.md`

## Global Constraints

- Work only under `C:\Users\stewa\Desktop\fly`
- Do not load `body-stats` or the full 152M-edge graph
- Traced-only atlas; point cloud requires soma
- Coordinates: `um = voxel * 0.008`, origin at soma centroid
- Partner K = 15 in and 15 out from significant-only edges
- `pC1_` prefix must not match `LPC1` / `LLPC1`
- Skeleton cap 400; SWC from `skeletons-malecns/skeletons-swc/{bodyId}.swc`
- Visual identity: void `#16130f`, Fraunces + Atkinson Hyperlegible + Fragment Mono, micron stage ticks
- Data CC-BY; credit Berg et al. 2026 in the UI

## File map

- Create: `atlas/__init__.py`, `atlas/coords.py`, `atlas/intern.py`, `atlas/select.py`, `atlas/partners.py`, `atlas/io_pack.py`, `atlas/skeletons.py`, `atlas/stories.py`
- Create: `bake.py`, `requirements.txt`, `.gitignore`, `README.md`
- Create: `stories/courtship.json`, `stories/walking.json`, `stories/vision.json`
- Create: `web/index.html`, `web/css/atlas.css`, `web/js/{load,palette,scene,select,stories,main}.js`
- Create: `blender/import_atlas.py`
- Create: `tests/test_coords.py`, `tests/test_intern.py`, `tests/test_select.py`, `tests/test_partners.py`, `tests/test_io_pack.py`, `tests/test_stories.py`
- Ignore: `data/runtime/`, `__pycache__/`, `.venv/`

---

### Task 1: Coordinates, intern, story selector

**Files:**
- Create: `atlas/coords.py`, `atlas/intern.py`, `atlas/select.py`
- Test: `tests/test_coords.py`, `tests/test_intern.py`, `tests/test_select.py`

**Interfaces:**
- Produces: `voxel_to_um(xyz) -> tuple[float,float,float]`; `center_um(points) -> tuple`; `apply_center(xyz, center) -> tuple`
- Produces: `InternTable.intern(value) -> int`; `InternTable.strings -> list[str]`; empty/None intern as `""` at index 0
- Produces: `match_neurons(records, select_dict) -> list[int]` of bodyIds; `typePrefix` uses `str.startswith`; `sample` keeps lowest ids

- [ ] Failing tests for 8 nm conversion, intern of None, `pC1_` vs `LPC1`, sample lowest ids
- [ ] Implement until pytest passes
- [ ] Commit

### Task 2: Top-k partners + pack I/O

**Files:**
- Create: `atlas/partners.py`, `atlas/io_pack.py`
- Test: `tests/test_partners.py`, `tests/test_io_pack.py`

**Interfaces:**
- Consumes: edge list of `(pre, post, weight)` and traced id set
- Produces: `topk_partners(edges, ids, k_in=15, k_out=15) -> dict[int, PartnerRow]`
- Produces: `write_partners_bin(path, ids_sorted, rows, k_in=15, k_out=15)`; `read_partners_bin(path)`; `write_neurons_gz` / `read_neurons_gz`
- Weight clip 65535; missing partners pad bodyId 0

- [ ] Failing tests on a 6-edge toy graph and round-trip bin/json
- [ ] Implement until pytest passes
- [ ] Commit

### Task 3: Bake CLI

**Files:**
- Create: `bake.py`, `atlas/bake.py`, `requirements.txt`, `.gitignore`
- Test: `tests/test_bake_smoke.py` (uses tiny fixture tables, not the 1 GB file)

**Interfaces:**
- Produces: `bake_from_tables(ann, nt, edges, stories, out_dir) -> BakeResult(n, n_soma, story_counts)`
- CLI: `python bake.py` reads `data/*.feather`, writes `data/runtime/`

- [ ] Fixture bake writes aligned json+bin
- [ ] Wire real Feather paths
- [ ] Run `python bake.py` on the real data
- [ ] Commit (not the runtime binaries if huge; runtime is gitignored)

### Task 4: Stories + skeleton list

**Files:**
- Create: `stories/*.json`, `atlas/stories.py`, `atlas/skeletons.py`
- Test: `tests/test_stories.py`

**Interfaces:**
- Produces: `resolve_story(story, records) -> story with bodyIds per step`
- Produces: `skeleton_ids(stories, cap=400) -> list[int]`
- Produces: `download_swc(body_id, dest, center, timeout)` rewriting to centered µm

- [ ] Tests for resolve + cap
- [ ] Author three story JSON files from the spec
- [ ] `python bake.py --skeletons` downloads ≤400
- [ ] Commit

### Task 5: Browser cloud + selection + stories

**Files:**
- Create: `web/index.html`, `web/css/atlas.css`, `web/js/*.js`

**Interfaces:**
- Loads `/data/runtime/neurons.json.gz` and `partners.bin`
- Point cloud of hasSoma; click → top-15 lines; search; color modes; superclass filters; three tours

- [ ] Implement static page per spec visual tokens
- [ ] Serve repo root and verify in browser
- [ ] Commit

### Task 6: Blender import

**Files:**
- Create: `blender/import_atlas.py`

**Interfaces:**
- `import_atlas(runtime_dir)` builds collection `MaleCNS` with cloud, story curves, cameras `whole|brain|vnc|optic|courtship`

- [ ] Script reads the same pack
- [ ] Run against connected Blender if available
- [ ] Commit

### Task 7: README + credit

**Files:**
- Create: `README.md`

- [ ] How to bake, serve, import; CC-BY + Berg et al. 2026
- [ ] Commit
