from __future__ import annotations

import array
import struct
import sys
from pathlib import Path

MAGIC = b"LACE"
VERSION = 2


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
    bodies: list[tuple[int, array.array]] = []
    for path in sorted(skel_dir.glob("*.swc")):
        try:
            body_id = int(path.stem)
        except ValueError:
            continue
        segs = swc_segments(path.read_text(encoding="utf-8"))
        if not segs:
            continue
        arr: array.array = array.array("f")
        for seg in segs:
            arr.extend(seg)
        bodies.append((body_id, arr))

    n_segments = sum(len(arr) // 6 for _, arr in bodies)
    header = bytearray(struct.pack("<4sIII", MAGIC, VERSION, len(bodies), n_segments))
    first = 0
    positions: array.array = array.array("f")
    for body_id, arr in bodies:
        n_seg = len(arr) // 6
        header.extend(struct.pack("<qII", body_id, first, n_seg))
        positions.extend(arr)
        first += n_seg

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(bytes(header) + positions.tobytes())
    return len(bodies)


def read_lace(path: Path) -> dict:
    data = path.read_bytes()
    magic, version, a, b = struct.unpack_from("<4sIII", data, 0)
    if magic != MAGIC:
        raise ValueError(f"bad lace magic {magic!r}")
    if version == 1:
        n_segments = a
        offset = struct.calcsize("<4sII")
        n_floats = n_segments * 6
        buf = array.array("f")
        buf.frombytes(data[offset : offset + n_floats * 4])
        if sys.byteorder != "little":
            buf.byteswap()
        return {"version": 1, "n_segments": n_segments, "positions": list(buf), "bodies": []}

    n_bodies, n_segments = a, b
    offset = struct.calcsize("<4sIII")
    bodies = []
    for _ in range(n_bodies):
        body_id, first, n_seg = struct.unpack_from("<qII", data, offset)
        bodies.append({"id": body_id, "first": first, "n": n_seg})
        offset += 16
    n_floats = n_segments * 6
    buf = array.array("f")
    buf.frombytes(data[offset : offset + n_floats * 4])
    if sys.byteorder != "little":
        buf.byteswap()
    return {
        "version": 2,
        "n_segments": n_segments,
        "positions": list(buf),
        "bodies": bodies,
    }
