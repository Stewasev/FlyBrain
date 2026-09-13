# Male CNS Atlas — Design

Date: 2026-09-12
Status: approved
Dataset: Janelia Male CNS connectome v1.0 (CC-BY 4.0)
Cite: Berg et al., *Sexual dimorphism in the complete Drosophila male central nervous system connectome* (Cell, 2026)

## Goal

A local offline atlas of the adult male *Drosophila* CNS that lives entirely in `C:\Users\stewa\Desktop\fly`. One baked runtime pack feeds three surfaces:

1. A browser fly-through of ~140k somas
2. A Blender cinematic twin of the same pack
3. Three guided circuit tours (courtship, walking, vision) on both surfaces

A fourth “something else” idea is deferred until these three ship.

## Approach

**Offline atlas.** Python bake converts the official Feather tables into a compact runtime pack. The browser is a static Three.js page. Blender imports the same pack. Stories are JSON tours. No server, no neuPrint token, no EM volume.

## Source data (already on disk)

`data/` holds official v1.0 tables from `gs://flyem-male-cns/v1.0/connectome-data/flat-connectome/`:

| File | Use |
|---|---|
| `body-annotations-male-cns-v1.0-minconf-0.5.feather` | bodyId, type, superclass, class, subclass, somaLocation, somaSide, dimorphism, fruDsx, status |
| `body-neurotransmitters-male-cns-v1.0.feather` | `body` → `consensus_nt` |
| `connectome-weights-male-cns-v1.0-minconf-0.5-significant-only.feather` | `body_pre`, `body_post`, `weight` (25.6M edges) |

Not used at runtime: full 152M-edge graph, `body-stats` (88M fragments), synapse point tables, EM imagery.

Skeletons are fetched on demand from:

`https://storage.googleapis.com/flyem-male-cns/v1.0/segmentation/skeletons-malecns/skeletons-swc/{bodyId}.swc`

SWC coordinates are Male CNS EM voxels in **8 nm units**.

## Who is in the atlas

Include a neuron if `status == "Traced"`.

- **Point cloud:** traced neurons whose `somaLocation` is a 3-vector.
- **Partner index:** all traced neurons (soma-less cells can appear as partners but have no dot).
- **Exclude:** glia, orphans, unimportant, and the 88M tiny `body-stats` fragments.

## Coordinates

- Source: EM voxel XYZ, 8 nm per voxel.
- Runtime: micrometres, `xyz_um = voxel * 0.008`.
- Pack also stores `center` = mean soma position in µm, so the viewer and Blender can place the origin at the cloud centroid.
- SWC bake uses the same conversion and the same center.

## Runtime pack (`data/runtime/`)

Gitignored. Produced by `python bake.py`.

### `neurons.json.gz`

Columnar JSON, gzip-compressed:

```json
{
  "version": 1,
  "units": "um",
  "center": [cx, cy, cz],
  "n": 140024,
  "strings": {
    "superclass": ["cb_intrinsic", "..."],
    "type": ["DNge104", "..."],
    "class": ["MBON", "..."],
    "subclass": ["leg", "..."],
    "side": ["left", "right", "midline", ""],
    "nt": ["acetylcholine", "gaba", "glutamate", "dopamine", "serotonin", "octopamine", "histamine", "unclear", ""],
    "dimorphism": ["", "male-specific", "sexually dimorphic", "potentially sexually dimorphic", "potentially male-specific"],
    "fruDsx": ["", "fru_high", "fru_low", "dsx_high", "dsx_low", "coexpress_high", "coexpress_low"]
  },
  "id": [12781, "..."],
  "x": [], "y": [], "z": [],
  "type": [], "superclass": [], "class": [], "subclass": [],
  "side": [], "nt": [], "dimorphism": [], "fruDsx": [],
  "hasSoma": [],
  "wOut": [],
  "wIn": []
}
```

Index fields are uint16 (or uint8 where the table is tiny) into `strings.*`. Missing labels intern as `""`. `hasSoma` is 0/1. Neurons without a soma still occupy a row (`x=y=z=0`, `hasSoma=0`) so partner indices stay aligned. `wOut` / `wIn` are summed significant-edge weights, not site counts from `body-stats`.

Neuron order is sorted by `id` (bodyId). The same order is used in `partners.bin`.

NT join: `body-neurotransmitters.body == annotations.bodyId`, take `consensus_nt`. Bodies present only in the NT file (untraced fragments) are ignored.

### `partners.bin`

Little-endian.

```
magic        char[4]  "MCNP"
version      uint32   1
n            uint32
k_in         uint16   15
k_out        uint16   15
id           int64[n]   bodyIds, sorted, same order as neurons.json
for each neuron i in 0..n-1:
  in_id      int64[k_in]    partner bodyId, 0 = pad
  in_w       uint16[k_in]   weight, 0 = pad
  out_id     int64[k_out]
  out_w      uint16[k_out]
```

Partners come from the significant-only graph, restricted to traced↔traced edges. For each neuron: 15 strongest upstream (`body_post == id`) and 15 strongest downstream (`body_pre == id`). Weights above 65535 clip to 65535.

### `skeletons/{bodyId}.swc`

Only story neurons, cap **400 files**. Coordinates rewritten to µm, centered with the same `center` as `neurons.json.gz`. Original parent/radius preserved; radius converted `* 0.008`.

### `stories/{courtship,walking,vision}.json`

Copied from `stories/` at bake time so the runtime pack is self-contained. Schema:

```json
{
  "id": "courtship",
  "title": "Courtship",
  "subtitle": "P1 command to song motor",
  "steps": [
    {
      "id": "pc1",
      "title": "P1 command cluster",
      "narration": "...",
      "camera": "brain",
      "color": "fruDsx",
      "select": { "typePrefix": ["pC1_"] },
      "showSkeletons": true,
      "showPartners": false
    }
  ]
}
```

`select` may combine (AND across keys, OR within a list):

- `typePrefix`: string prefixes; match is `type.startswith(prefix)`. **`pC1_` must not match `LPC1` or `LLPC1`.**
- `typeExact`: exact type strings
- `superclass`: exact
- `subclass`: exact
- `dimorphism`: exact
- `fruDsx`: exact
- `sample`: optional int; if the match set is larger, keep `sample` bodyIds (stable: lowest ids)

Cameras: `whole`, `brain`, `vnc`, `optic`, `courtship`.

### Bake CLI

```
python bake.py              # neurons.json.gz + partners.bin + copy stories
python bake.py --skeletons  # also download/convert SWCs for story cells
```

Idempotent. Resume skeleton downloads. Never rewrite source Feathers.

## Browser fly-through (`web/`)

Static page. Serve the **repo root** (`python -m http.server` from `fly/`) so `/data/runtime/` and `/web/` share origin.

### Scene

- Dark void, one `BufferGeometry` point cloud of `hasSoma==1` neurons.
- Orbit / pan / zoom. No default three.js grid. Microscope-stage hairline ticks in µm (signature).
- Default color: **superclass**.

### Click

- Cloud dims. Selected soma bright. Top 15 in / 15 out as thin lines (upstream vs downstream colors).
- If `data/runtime/skeletons/{id}.swc` exists, draw that polyline.
- Inspector lists type, NT, dimorphism, fru/dsx, partner rows (click jumps).

### HUD

- Search: type substring or bodyId; Enter selects and frames
- Color: superclass | neurotransmitter | dimorphism | fru/dsx
- Filters: superclass checkboxes (hiding `ol_intrinsic` unclutters the brain)
- Stories: Courtship / Walking / Vision — Next / Prev / Play

### Visual identity

This is a specimen on a TEM stage, not a SaaS dashboard.

| Token | Hex | Role |
|---|---|---|
| `void` | `#16130f` | Warm carbon-stub black |
| `ink` | `#e6dcc8` | Label ink |
| `mute` | `#8a8070` | Secondary copy |
| `gold` | `#e0a84a` | Optic lobe / ommatidia |
| `teal` | `#5ea8a0` | Central brain / neuropil stain |
| `rust` | `#c45c26` | VNC / cuticle |
| `fru` | `#7dba6a` | fruitless |
| `dsx` | `#d46bb3` | doublesex |
| `up` | `#7ec8e3` | upstream edges |
| `down` | `#e0a84a` | downstream edges |

- Display: **Fraunces** (Latin species line only)
- UI: **Atkinson Hyperlegible**
- IDs / counts: **Fragment Mono**
- Signature: hanging CNS + micron stage ticks. HUD is a corner log book, not a card grid.
- Superclass palette uses gold / teal / rust / ink; NT uses distinct stains; dimorphism paints male-specific gold, dimorphic rust, the rest mute.

### Out of scope (browser)

Neuropil meshes, EM slices, live 25M-edge queries, accounts, bundler.

## Blender scene

`blender/import_atlas.py` reads the runtime pack (not Feathers). Targets collection `MaleCNS` and replaces it if present.

- Soma cloud: one mesh, vertices at centered µm, color attributes `superclass`, `nt`, `dimorphism`, `fruDsx`. Geometry Nodes set point radius.
- Story skeletons: curves under `Stories/Courtship`, `Stories/Walking`, `Stories/Vision`.
- Story edges: only tour connections.
- Named cameras: `whole`, `brain`, `vnc`, `optic`, `courtship`.
- World: void `#16130f`, emissive points, EEVEE.

Out of scope: EM volume, neuropil meshes, full connectome as curves, physics.

## Circuit stories

### Courtship

1. Wash: `fruDsx` in `fru_high` / `dsx_high` / `coexpress_high` (points only, `sample` if needed) — “sex-determination genes mark the courtship nervous system”
2. `typePrefix: ["pC1_"]` — P1 command cluster
3. `typePrefix: ["mAL"]` — male-specific mAL
4. `typeExact: ["pIP10", "aSP22", "DNp13"]` — descending song/courtship
5. `typeExact: ["vPR6"]` plus `typePrefix: ["TN1c_"]` — VNC song motor
6. `typePrefix: ["LC10"]` — visual tracking of a mate

### Walking

1. `subclass` in `leg`, `leg bristle`, `campaniform sensilla`, `chordotonal organ` — points, sample skeletons
2. Keep VNC cloud; narration names local premotor (no huge skeleton dump)
3. `typeExact: ["MDN"]` plus a few `typePrefix: ["DNg"]` with `sample: 12`
4. `typeExact: ["Ti flexor MN", "Ti extensor MN", "Tr flexor MN", "Tr extensor MN"]`

### Vision

1. `typePrefix: ["T4", "T5"]` as points; `sample: 16` skeletons
2. `typeExact: ["LC10a", "LC4", "LPLC2"]`
3. A small visual descending set: `typeExact` of a few `DNp*` / `DNge*` that the bake finds connected to those VPNs (computed at bake, written into the story runtime copy as resolved `bodyIds` if needed). If that join is empty, skip the step and keep LC/LPLC as the last beat.

Skeleton budget: union of showSkeletons steps, **≤ 400** SWCs. If over cap, drop from the largest sample first.

## How to run

```
pip install -r requirements.txt
python bake.py
python bake.py --skeletons
python -m http.server 8000
# open http://localhost:8000/web/
# Blender: run blender/import_atlas.py
```

## Testing

- Unit tests for µm conversion, string intern, top-k partners, `pC1_` prefix (does not match `LPC1`), SWC coordinate rewrite, story selector.
- Bake smoke: `neurons.json.gz` parses, `n` equals partner table length, every story step resolves ≥ 1 neuron.
- Browser: manual — load, orbit, click, search, three tours.

## License / credit

Male CNS data CC-BY. UI copy credits FlyEM / Cambridge / MRC LMB / Google Research and Berg et al. 2026.
