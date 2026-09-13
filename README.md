# Male CNS atlas

A local (and GitHub Pages) 3D atlas of the adult male *Drosophila* central nervous system — Janelia Male CNS v1.0.

165,122 traced neurons. 140,024 somas. Arbor lace through the neuropil. Tours for courtship, walking, and vision.

Data: [male-cns.janelia.org](https://male-cns.janelia.org) · CC-BY · Berg et al., *Cell* 2026.

## Play

**Online:** https://stewasev.github.io/FlyBrain/

**On your machine** (after `git clone https://github.com/Stewasev/FlyBrain.git`):

| You | Do this |
|---|---|
| Windows | Double-click `play.bat` |
| macOS / Linux | `chmod +x play.sh` once, then `./play.sh` |

That starts a local server and opens http://127.0.0.1:8000/ — no bake, no npm. You need [Python 3](https://www.python.org/downloads/) on PATH (Windows installer: tick **Add python.exe to PATH**). Ctrl+C or close the window to stop.

The address bar is the share link. **Copy link** copies it. Examples: `#t=dimorphism&s=1`, `#live=vision` (simulated activity), `#type=pC1_1a`, `#id=12781&c=fruDsx`. Add `?embed=1` to hide the logbook. Kiosk: `?embed=1#live=vision`.

Or by hand from the repo root:

```
python -m http.server 8000 --bind 127.0.0.1
```

| Key | Action |
|---|---|
| drag / scroll | orbit, zoom |
| click | select a soma |
| `1` `2` `3` `4` | courtship, walking, vision, dimorphism |
| `L` | Live tab (simulated spikes on the real graph) |
| `←` `→` | tour step |
| `space` | play / pause |
| `esc` | exit tour |
| `/` | find a type |

## GitHub Pages

This repo is already live at https://stewasev.github.io/FlyBrain/ (branch `main`, folder `/`). First load is ~85 MB.

To host your own fork: **Settings → Pages → Deploy from a branch → `main` / root**. Keep `.nojekyll` in the root.

## Rebuild the runtime pack

Source Feathers live in `data/` (gitignored; download with `download.ps1`). Then:

```
pip install -r requirements.txt
python bake.py
python bake.py --skeletons
```

`data/runtime/skeletons/` stays local. The site reads `lace.bin` (indexed arbors), `neurons.json.gz`, `partners.bin`, and `stories/`.

Blender (optional):

```
blender --background --python blender/import_atlas.py -- --stain dimorphism --save blender/MaleCNS.blend --render blender/dimorphism.png
```

## Layout

| Path | What |
|---|---|
| `index.html` | Atlas |
| `web/` | CSS, JS, vendored Three.js r170 |
| `data/runtime/` | Baked pack the page loads |
| `stories/` | Tour scripts (source) |
| `atlas/` | Bake library |
| `blender/import_atlas.py` | Blender twin |
| `blender/MaleCNS.blend` | Saved scene (dimorphism stain) |
| `blender/dimorphism.png` | Ortho still |

## Credit

FlyEM (HHMI Janelia), University of Cambridge, MRC LMB, Google Research. Dataset CC-BY. Code MIT — see `LICENSE`.
