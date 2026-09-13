from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import urlopen

from atlas.coords import apply_center, voxel_to_um

SWC_URL = (
    "https://storage.googleapis.com/flyem-male-cns/v1.0/segmentation/"
    "skeletons-malecns/skeletons-swc/{body_id}.swc"
)


def convert_swc_text(text: str, center: tuple[float, float, float]) -> str:
    out_lines: list[str] = ["# Male CNS atlas: µm, centered"]
    for line in text.splitlines():
        raw = line.strip()
        if not raw or raw.startswith("#"):
            continue
        parts = raw.split()
        if len(parts) < 7:
            continue
        n, t, x, y, z, r, parent = parts[:7]
        um = voxel_to_um((float(x), float(y), float(z)))
        cx, cy, cz = apply_center(um, center)
        ru = float(r) * 0.008
        out_lines.append(f"{n} {t} {cx:.4f} {cy:.4f} {cz:.4f} {ru:.4f} {parent}")
    return "\n".join(out_lines) + "\n"


def download_swc(body_id: int, dest: Path, center: tuple[float, float, float], timeout: int = 60) -> bool:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return True
    url = SWC_URL.format(body_id=body_id)
    try:
        with urlopen(url, timeout=timeout) as resp:
            text = resp.read().decode("utf-8", errors="replace")
    except Exception:
        return False
    if "html" in text[:80].lower():
        return False
    dest.write_text(convert_swc_text(text, center), encoding="utf-8")
    return True


def download_many(body_ids: list[int], dest_dir: Path, center: tuple[float, float, float], workers: int = 8) -> int:
    dest_dir.mkdir(parents=True, exist_ok=True)
    ok = 0
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futs = {
            pool.submit(download_swc, body_id, dest_dir / f"{body_id}.swc", center): body_id
            for body_id in body_ids
        }
        for fut in as_completed(futs):
            if fut.result():
                ok += 1
    return ok
