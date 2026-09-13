from __future__ import annotations

import gzip
import json
import struct
from pathlib import Path

from atlas.partners import PartnerRow

MAGIC = b"MCNP"
VERSION = 1


def write_neurons_gz(path: Path, pack: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = json.dumps(pack, separators=(",", ":")).encode("utf-8")
    path.write_bytes(gzip.compress(raw, compresslevel=6))


def read_neurons_gz(path: Path) -> dict:
    return json.loads(gzip.decompress(path.read_bytes()).decode("utf-8"))


def write_partners_bin(
    path: Path,
    ids: list[int],
    rows: dict[int, PartnerRow],
    k_in: int = 15,
    k_out: int = 15,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    n = len(ids)
    header = struct.pack("<4sIIHH", MAGIC, VERSION, n, k_in, k_out)
    body = bytearray()
    body.extend(struct.pack(f"<{n}q", *ids))
    for body_id in ids:
        row = rows[body_id]
        body.extend(struct.pack(f"<{k_in}q", *row.in_id))
        body.extend(struct.pack(f"<{k_in}H", *row.in_w))
        body.extend(struct.pack(f"<{k_out}q", *row.out_id))
        body.extend(struct.pack(f"<{k_out}H", *row.out_w))
    path.write_bytes(header + body)


def read_partners_bin(path: Path) -> dict:
    data = path.read_bytes()
    magic, version, n, k_in, k_out = struct.unpack_from("<4sIIHH", data, 0)
    if magic != MAGIC:
        raise ValueError(f"bad magic {magic!r}")
    offset = struct.calcsize("<4sIIHH")
    ids = list(struct.unpack_from(f"<{n}q", data, offset))
    offset += 8 * n
    rows: dict[int, PartnerRow] = {}
    rec = k_in * 8 + k_in * 2 + k_out * 8 + k_out * 2
    for i in range(n):
        in_id = list(struct.unpack_from(f"<{k_in}q", data, offset))
        offset += 8 * k_in
        in_w = list(struct.unpack_from(f"<{k_in}H", data, offset))
        offset += 2 * k_in
        out_id = list(struct.unpack_from(f"<{k_out}q", data, offset))
        offset += 8 * k_out
        out_w = list(struct.unpack_from(f"<{k_out}H", data, offset))
        offset += 2 * k_out
        rows[ids[i]] = PartnerRow(in_id=in_id, in_w=in_w, out_id=out_id, out_w=out_w)
        _ = rec
    return {"n": n, "version": version, "k_in": k_in, "k_out": k_out, "ids": ids, "rows": rows}
