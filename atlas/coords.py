from __future__ import annotations

NM_PER_VOXEL = 8.0


def voxel_to_um(xyz: tuple[float, float, float] | list[float]) -> tuple[float, float, float]:
    return (xyz[0] * 0.008, xyz[1] * 0.008, xyz[2] * 0.008)


def center_um(points: list[tuple[float, float, float]]) -> tuple[float, float, float]:
    n = len(points)
    if n == 0:
        return (0.0, 0.0, 0.0)
    sx = sy = sz = 0.0
    for x, y, z in points:
        sx += x
        sy += y
        sz += z
    return (sx / n, sy / n, sz / n)


def apply_center(
    xyz: tuple[float, float, float], center: tuple[float, float, float]
) -> tuple[float, float, float]:
    return (xyz[0] - center[0], xyz[1] - center[1], xyz[2] - center[2])
