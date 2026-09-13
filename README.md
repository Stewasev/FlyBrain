# Male CNS atlas

Local 3D atlas of the adult male *Drosophila* central nervous system (Janelia Male CNS v1.0). One bake feeds a browser fly-through, three circuit tours, and a Blender scene.

Data: [male-cns.janelia.org](https://male-cns.janelia.org) · CC-BY · Berg et al., Cell 2026.

## Setup

```
pip install -r requirements.txt
python bake.py
python bake.py --skeletons
python -m http.server 8000
```

Open http://localhost:8000/web/

`bake.py` reads `data/*.feather` and writes `data/runtime/` (gitignored). `--skeletons` pulls up to 400 public SWC files for the tour cells.

## Blender

In Blender’s Python console or Text Editor, run `blender/import_atlas.py`. It rebuilds collection `MaleCNS` from `data/runtime/`.

## Layout

| Path | What |
|---|---|
| `data/` | Official Feather tables |
| `data/runtime/` | Baked neurons, partners, stories, SWCs |
| `stories/` | Courtship, walking, vision tours |
| `web/` | Static Three.js atlas |
| `blender/import_atlas.py` | Cinematic twin |
| `atlas/` | Bake library |
| `docs/superpowers/` | Design spec and plan |
