# Male CNS atlas

A local (and GitHub Pages) 3D atlas of the adult male *Drosophila* central nervous system — Janelia Male CNS v1.0.

165,122 traced neurons. 140,024 somas. Arbor lace through the neuropil. Tours for courtship, walking, and vision.

Data: [male-cns.janelia.org](https://male-cns.janelia.org) · CC-BY · Berg et al., *Cell* 2026.

## Open it

Serve the **repo root** (not `web/`):

```
python -m http.server 8000
```

Then http://localhost:8000/

| Key | Action |
|---|---|
| drag / scroll | orbit, zoom |
| click | select a soma |
| `1` `2` `3` | courtship, walking, vision |
| `←` `→` | tour step |
| `space` | play / pause |
| `esc` | exit tour |
| `/` | find a type |

## GitHub Pages

1. Create a GitHub repo and push this folder (`git remote add origin …` then `git push -u origin master`).
2. **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: `master` (or `main`), folder: **/ (root)**
3. Wait a minute. The atlas is at `https://<user>.github.io/<repo>/`

The first load pulls ~85 MB (neurons + connectome + arbors). That is expected.

Do **not** enable Jekyll processing; `.nojekyll` is already in the root.

## Rebuild the runtime pack

Source Feathers live in `data/` (gitignored; download with `download.ps1`). Then:

```
pip install -r requirements.txt
python bake.py
python bake.py --skeletons
```

`data/runtime/skeletons/` stays local. The site reads `lace.bin` (indexed arbors), `neurons.json.gz`, `partners.bin`, and `stories/`.

## Layout

| Path | What |
|---|---|
| `index.html` | Atlas |
| `web/` | CSS, JS, vendored Three.js r170 |
| `data/runtime/` | Baked pack the page loads |
| `stories/` | Tour scripts (source) |
| `atlas/` | Bake library |
| `blender/import_atlas.py` | Blender twin |

## Credit

FlyEM (HHMI Janelia), University of Cambridge, MRC LMB, Google Research. Dataset CC-BY. Code MIT — see `LICENSE`.
