from __future__ import annotations

import array
import struct
import sys
from pathlib import Path

MAGIC = b"LACE"
VERSION = 1


def swc_segments(text: str) -> list[tuple[float, float, float, float, float, float]]:
    points: dict[int, tuple[float, float, float]] = {}
    links: list[tuple[int, int]] = []
    for line in text.splitlines():
        raw = line.strip()
        if not raw or raw.startswith("#"):
            continue
        parts = raw.split()
        if len(parts) < 7:
            continue
        n = int(float(parts[0]))
        x, y, z = float(parts[2]), float(parts[3]), float(parts[4])
        parent = int(float(parts[6]))
        points[n] = (x, y, z)
        links.append((n, parent))
    segs: list[tuple[float, float, float, float, float, float]] = []
    for n, parent in links:
        if parent < 0 or parent not in points or n not in points:
            continue
        ax, ay, az = points[parent]
        bx, by, bz = points[n]
        segs.append((ax, ay, az, bx, by, bz))
    return segs


def pack_lace(skel_dir: Path, out_path: Path) -> int:
    positions: array.array = array.array("f")
    n_files = 0
    for path in sorted(skel_dir.glob("*.swc")):
        segs = swc_segments(path.read_text(encoding="utf-8"))
        if not segs:
            continue
        n_files += 1
        for seg in segs:
            positions.extend(seg)
    n_segments = len(positions) // 6
    header = struct.pack("<4sII", MAGIC, VERSION, n_segments)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(header + positions.tobytes())
    return n_files


def read_lace(path: Path) -> dict:
    data = path.read_bytes()
    magic, version, n_segments = struct.unpack_from("<4sII", data, 0)
    if magic != MAGIC:
        raise ValueError(f"bad lace magic {magic!r}")
    offset = struct.calcsize("<4sII")
    n_floats = n_segments * 6
    buf = array.array("f")
    buf.frombytes(data[offset : offset + n_floats * 4])
    if sys.byteorder != "little":
        buf.byteswap()
    return {"version": version, "n_segments": n_segments, "positions": list(buf)}
