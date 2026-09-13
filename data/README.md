# Male CNS v1.0 — local data

Source: https://male-cns.janelia.org/download/
Bucket: `gs://flyem-male-cns/v1.0/connectome-data/flat-connectome/`
License: [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/)
Cite: Berg et al., *Sexual dimorphism in the complete Drosophila male central nervous system connectome* (Cell, 2026)

## Downloaded (core tables)

| File | Size | What it is |
|---|---|---|
| `body-annotations-male-cns-v1.0-minconf-0.5.feather` | 14 MB | Neuron classes, types, side, dimorphism, etc. |
| `body-neurotransmitters-male-cns-v1.0.feather` | 41 MB | Per-neuron neurotransmitter predictions |
| `body-stats-male-cns-v1.0-minconf-0.5.feather` | 742 MB | Per-segment synapse counts |
| `connectome-weights-male-cns-v1.0-minconf-0.5.feather` | 1.0 GB | Full neuron-to-neuron connection graph |

## Not downloaded (too large for this machine / not needed yet)

- `syn-points-*.feather` — 12.2 GB, individual synapse coordinates
- `syn-partners-*.feather` — 6.3 GB (full) / 2.8 GB (filtered)
- `tbar-neurotransmitters-*.feather` — 2.5 GB
- Raw EM, segmentation, and 166k SWC skeletons (GCS directories)

Re-run `..\download.ps1` to resume interrupted transfers.
