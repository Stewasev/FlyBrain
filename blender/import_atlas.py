"""Import data/runtime into collection MaleCNS.

From a terminal, with Blender on PATH:

  blender --background --python blender/import_atlas.py -- --stain dimorphism --save blender/MaleCNS.blend --render blender/dimorphism.png
"""
from __future__ import annotations

import argparse
import gzip
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "data" / "runtime"

SUPER_COLOR = {
    "ol_intrinsic": (0.878, 0.659, 0.290, 1),
    "cb_intrinsic": (0.369, 0.659, 0.627, 1),
    "vnc_intrinsic": (0.769, 0.361, 0.149, 1),
    "descending_neuron": (0.902, 0.863, 0.784, 1),
    "visual_projection": (0.941, 0.773, 0.431, 1),
    "vnc_motor": (0.878, 0.478, 0.259, 1),
}
DIMORPH_COLOR = {
    "male-specific": (0.91, 0.765, 0.416, 1),
    "sexually dimorphic": (0.769, 0.361, 0.149, 1),
    "potentially sexually dimorphic": (0.651, 0.486, 0.29, 1),
    "potentially male-specific": (0.769, 0.659, 0.416, 1),
}
DEFAULT_COLOR = (0.09, 0.082, 0.07, 1)


def _load_stories(runtime: Path):
    d = runtime / "stories"
    if not d.exists():
        return []
    return [json.loads(p.read_text(encoding="utf-8")) for p in sorted(d.glob("*.json"))]


def _parse_swc(path: Path):
    verts = []
    edges = []
    idx = {}
    with path.open(encoding="utf-8") as f:
        for line in f:
            s = line.strip()
            if not s or s.startswith("#"):
                continue
            p = s.split()
            if len(p) < 7:
                continue
            n = int(p[0])
            x, y, z = float(p[2]), float(p[3]), float(p[4])
            parent = int(p[6])
            idx[n] = len(verts)
            verts.append((x, y, z))
            if parent >= 0 and parent in idx:
                edges.append((idx[parent], idx[n]))
    return verts, edges


def _color_for(strings, pack, i, stain):
    if stain == "dimorphism":
        table = strings.get("dimorphism") or [""]
        idx = pack["dimorphism"][i]
        name = table[idx] if idx < len(table) else ""
        return DIMORPH_COLOR.get(name, DEFAULT_COLOR)
    table = strings.get("superclass") or [""]
    idx = pack["superclass"][i]
    name = table[idx] if idx < len(table) else ""
    return SUPER_COLOR.get(name, DEFAULT_COLOR)


def import_atlas(runtime_dir: Path | None = None, stain: str = "dimorphism"):
    import bpy
    from mathutils import Vector

    runtime = Path(runtime_dir) if runtime_dir else RUNTIME
    pack = json.loads(gzip.open(runtime / "neurons.json.gz", "rt", encoding="utf-8").read())
    strings = pack["strings"]

    if "MaleCNS" in bpy.data.collections:
        old = bpy.data.collections["MaleCNS"]
        for obj in list(old.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        for child in list(old.children):
            for obj in list(child.objects):
                bpy.data.objects.remove(obj, do_unlink=True)
            bpy.data.collections.remove(child)
        bpy.data.collections.remove(old)

    root = bpy.data.collections.new("MaleCNS")
    bpy.context.scene.collection.children.link(root)
    cloud_col = bpy.data.collections.new("Cloud")
    stories_col = bpy.data.collections.new("Stories")
    cam_col = bpy.data.collections.new("Cameras")
    root.children.link(cloud_col)
    root.children.link(stories_col)
    root.children.link(cam_col)

    xs, ys, zs = pack["x"], pack["y"], pack["z"]
    has = pack["hasSoma"]
    verts = []
    colors = []
    for i, flag in enumerate(has):
        if not flag:
            continue
        verts.append((xs[i], ys[i], zs[i]))
        colors.append(_color_for(strings, pack, i, stain))

    mesh = bpy.data.meshes.new("somas")
    mesh.from_pydata(verts, [], [])
    color_attr = mesh.color_attributes.new(name=stain, type="FLOAT_COLOR", domain="POINT")
    for i, c in enumerate(colors):
        color_attr.data[i].color = c
    obj = bpy.data.objects.new("somas", mesh)
    cloud_col.objects.link(obj)

    mat = bpy.data.materials.new("soma_emission")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out_n = nodes.new("ShaderNodeOutputMaterial")
    em = nodes.new("ShaderNodeEmission")
    em.inputs[0].default_value = (0.91, 0.765, 0.416, 1)
    em.inputs[1].default_value = 4.0
    attr = nodes.new("ShaderNodeAttribute")
    attr.attribute_name = stain
    links.new(attr.outputs["Color"], em.inputs["Color"])
    links.new(em.outputs["Emission"], out_n.inputs["Surface"])

    ng = bpy.data.node_groups.new("SomaPoints", "GeometryNodeTree")
    try:
        ng.interface.new_socket(name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
        ng.interface.new_socket(name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    except Exception:
        ng.inputs.new("NodeSocketGeometry", "Geometry")
        ng.outputs.new("NodeSocketGeometry", "Geometry")
    gn_nodes = ng.nodes
    gn_links = ng.links
    gin = gn_nodes.new("NodeGroupInput")
    gout = gn_nodes.new("NodeGroupOutput")
    m2p = gn_nodes.new("GeometryNodeMeshToPoints")
    m2p.inputs["Radius"].default_value = 2.2
    set_mat = gn_nodes.new("GeometryNodeSetMaterial")
    set_mat.inputs["Material"].default_value = mat
    gn_links.new(gin.outputs[0], m2p.inputs["Mesh"])
    gn_links.new(m2p.outputs["Points"], set_mat.inputs["Geometry"])
    gn_links.new(set_mat.outputs["Geometry"], gout.inputs[0])
    mod = obj.modifiers.new("points", "NODES")
    mod.node_group = ng

    for story in _load_stories(runtime):
        col = bpy.data.collections.new(story["id"].title())
        stories_col.children.link(col)
        ids = []
        for step in story.get("steps", []):
            if step.get("showSkeletons"):
                ids.extend(step.get("skeletonIds") or step.get("bodyIds") or [])
        seen = set()
        for body_id in ids:
            if body_id in seen:
                continue
            seen.add(body_id)
            swc = runtime / "skeletons" / f"{body_id}.swc"
            if not swc.exists():
                continue
            v, e = _parse_swc(swc)
            if not v:
                continue
            m = bpy.data.meshes.new(f"skel_{body_id}")
            m.from_pydata(v, e, [])
            o = bpy.data.objects.new(f"{story['id']}_{body_id}", m)
            col.objects.link(o)

    min_x, max_x = min(v[0] for v in verts), max(v[0] for v in verts)
    min_y, max_y = min(v[1] for v in verts), max(v[1] for v in verts)
    min_z, max_z = min(v[2] for v in verts), max(v[2] for v in verts)
    cx, cy, cz = (min_x + max_x) / 2, (min_y + max_y) / 2, (min_z + max_z) / 2
    span_y, span_z = max_y - min_y, max_z - min_z
    look = Vector((cx, cy, cz))
    # Camera local -Z looks down world -X (side view: Z along frame width, Y up).
    side_rot = (0.0, math.radians(90.0), 0.0)
    brain_z = min_z + 0.22 * span_z
    vnc_z = max_z - 0.18 * span_z
    cams = {
        "whole": (Vector((cx + 800, cy, cz)), max(span_y, span_z) * 1.18),
        "brain": (Vector((cx + 800, cy, brain_z)), max(span_y, span_z * 0.55) * 1.1),
        "vnc": (Vector((cx + 800, cy, vnc_z)), max(span_y, span_z * 0.55) * 1.1),
        "dimorphism": (Vector((cx + 800, cy, cz)), max(span_y, span_z) * 1.12),
    }
    scene_cam = None
    for name, (loc, ortho) in cams.items():
        cam = bpy.data.cameras.new(name)
        cam.type = "ORTHO"
        cam.ortho_scale = ortho
        ob = bpy.data.objects.new(name, cam)
        ob.location = loc
        ob.rotation_euler = side_rot
        cam_col.objects.link(ob)
        if name == "dimorphism":
            scene_cam = ob
    if scene_cam:
        bpy.context.scene.camera = scene_cam

    world = bpy.context.scene.world or bpy.data.worlds.new("MaleCNSWorld")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.063, 0.055, 0.047, 1)
        bg.inputs[1].default_value = 0.15
    for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            bpy.context.scene.render.engine = engine
            break
        except Exception:
            continue
    bpy.context.scene.render.resolution_x = 1920
    bpy.context.scene.render.resolution_y = 1080
    bpy.context.scene.render.film_transparent = False
    print(f"MaleCNS imported: {len(verts)} somas stain={stain}")
    return root


def _argv_after_dashdash(argv):
    if "--" in argv:
        return argv[argv.index("--") + 1 :]
    return argv[1:]


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--runtime", default=str(RUNTIME))
    parser.add_argument("--stain", default="dimorphism", choices=("dimorphism", "superclass"))
    parser.add_argument("--save", default="")
    parser.add_argument("--render", default="")
    args = parser.parse_args(_argv_after_dashdash(argv or sys.argv))
    import_atlas(Path(args.runtime), stain=args.stain)
    import bpy

    if args.save:
        path = Path(args.save)
        path.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(path.resolve()))
        print(f"saved {path}")
    if args.render:
        path = Path(args.render)
        path.parent.mkdir(parents=True, exist_ok=True)
        bpy.context.scene.render.filepath = str(path.resolve())
        bpy.ops.render.render(write_still=True)
        print(f"rendered {path}")


if __name__ == "__main__":
    main()
