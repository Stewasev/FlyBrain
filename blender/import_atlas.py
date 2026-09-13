"""Import data/runtime into a MaleCNS collection. Run inside Blender."""
from __future__ import annotations

import gzip
import json
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
DEFAULT_COLOR = (0.54, 0.50, 0.44, 1)


def _load_neurons():
    path = RUNTIME / "neurons.json.gz"
    with gzip.open(path, "rt", encoding="utf-8") as f:
        return json.load(f)


def _load_stories():
    d = RUNTIME / "stories"
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


def import_atlas(runtime_dir: Path | None = None):
    import bpy
    from mathutils import Vector

    runtime = Path(runtime_dir) if runtime_dir else RUNTIME
    pack = json.loads(gzip.open(runtime / "neurons.json.gz", "rt", encoding="utf-8").read())
    strings = pack["strings"]

    if "MaleCNS" in bpy.data.collections:
        old = bpy.data.collections["MaleCNS"]
        for obj in list(old.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
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
    sc = pack["superclass"]
    verts = []
    colors = []
    for i, flag in enumerate(has):
        if not flag:
            continue
        verts.append((xs[i], ys[i], zs[i]))
        name = strings["superclass"][sc[i]] if sc[i] < len(strings["superclass"]) else ""
        colors.append(SUPER_COLOR.get(name, DEFAULT_COLOR))

    mesh = bpy.data.meshes.new("somas")
    mesh.from_pydata(verts, [], [])
    color_attr = mesh.color_attributes.new(name="superclass", type="FLOAT_COLOR", domain="POINT")
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
    em.inputs[0].default_value = (0.902, 0.863, 0.784, 1)
    em.inputs[1].default_value = 3.0
    attr = nodes.new("ShaderNodeAttribute")
    attr.attribute_name = "superclass"
    links.new(attr.outputs["Color"], em.inputs["Color"])
    links.new(em.outputs["Emission"], out_n.inputs["Surface"])

    ng = bpy.data.node_groups.new("SomaPoints", "GeometryNodeTree")
    ng.interface.new_socket(name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket(name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    gn_nodes = ng.nodes
    gn_links = ng.links
    gin = gn_nodes.new("NodeGroupInput")
    gout = gn_nodes.new("NodeGroupOutput")
    m2p = gn_nodes.new("GeometryNodeMeshToPoints")
    m2p.inputs["Radius"].default_value = 1.4
    set_mat = gn_nodes.new("GeometryNodeSetMaterial")
    set_mat.inputs["Material"].default_value = mat
    gn_links.new(gin.outputs[0], m2p.inputs["Mesh"])
    gn_links.new(m2p.outputs["Points"], set_mat.inputs["Geometry"])
    gn_links.new(set_mat.outputs["Geometry"], gout.inputs[0])
    mod = obj.modifiers.new("points", "NODES")
    mod.node_group = ng

    for story in _load_stories():
        col = bpy.data.collections.new(story["id"].title())
        stories_col.children.link(col)
        ids = []
        for step in story.get("steps", []):
            if step.get("showSkeletons"):
                ids.extend(step.get("bodyIds") or [])
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

    cams = {
        "whole": ((420, 80, 40), (0, 0, 0)),
        "brain": ((80, 220, 40), (0, 80, 0)),
        "vnc": ((80, -280, 40), (0, -120, 0)),
        "optic": ((260, 140, 20), (80, 90, 0)),
        "courtship": ((40, 160, 180), (0, 40, 0)),
    }
    for name, (loc, target) in cams.items():
        cam = bpy.data.cameras.new(name)
        ob = bpy.data.objects.new(name, cam)
        ob.location = loc
        direction = Vector(target) - Vector(loc)
        ob.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
        cam_col.objects.link(ob)

    world = bpy.context.scene.world or bpy.data.worlds.new("MaleCNSWorld")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.086, 0.075, 0.059, 1)
        bg.inputs[1].default_value = 0.2
    for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
        try:
            bpy.context.scene.render.engine = engine
            break
        except Exception:
            continue
    print(f"MaleCNS imported: {len(verts)} somas")
    return root


if __name__ == "__main__":
    runtime = sys.argv[-1] if len(sys.argv) > 1 and sys.argv[-1].endswith("runtime") else None
    import_atlas(runtime)
