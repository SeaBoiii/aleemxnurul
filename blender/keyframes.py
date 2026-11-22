"""Keyframes for the immersive site: the river, the magpie bridge and the seal.

Each key moment is built here with exact composition, rendered as a portrait start and end
frame, and handed to Higgsfield as the first and last frame of a hero clip.

    blender -b --factory-startup -P blender/keyframes.py -- --keys A1 A2 B1 B2 C1 C2 [--scale 0.5] [--save]

Keys: A = the Silver River at night, B = the magpies building the bridge, C = the seal.
Renders land in blender/renders/<key>.png (1080x1920 at scale 1).

    blender -b --factory-startup -P blender/keyframes.py -- --export

writes public/models/props.glb: the paper plane, a magpie, the envelope (flap on its hinge) and
the seal whole and broken, for the site to render live.
"""
import math
import random
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Euler, Vector

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'blender' / 'renders'
MONOGRAM = ROOT / 'public' / 'brand' / 'monogram.png'

NIGHT0 = (0.0039, 0.0080, 0.0140)   # #04121D, linear-ish
NIGHT1 = (0.0010, 0.0420, 0.0720)   # #033A4E
CHAMPAGNE = (0.69, 0.46, 0.17)      # #D9B472
CHAMPAGNE_SOFT = (0.88, 0.72, 0.43)
BLUSH = (0.90, 0.47, 0.53)
PAPER = (0.98, 0.92, 0.82)
INK = (0.006, 0.010, 0.018)

random.seed(214)


def args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    keys, scale, save = [], 1.0, False
    i = 0
    while i < len(argv):
        if argv[i] == '--keys':
            i += 1
            while i < len(argv) and not argv[i].startswith('--'):
                keys.append(argv[i]); i += 1
            continue
        if argv[i] == '--scale':
            scale = float(argv[i + 1]); i += 2; continue
        if argv[i] == '--save':
            save = True
        if argv[i] == '--export':
            keys = ['EXPORT']
        i += 1
    return keys or ['A1'], scale, save


# ---------------------------------------------------------------- scene and look

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x, scene.render.resolution_y = 1080, 1920
    scene.render.film_transparent = False
    scene.eevee.taa_render_samples = 96
    try:
        scene.view_settings.view_transform = 'AgX'
        scene.view_settings.look = 'AgX - Medium High Contrast'
    except TypeError:
        pass
    scene.view_settings.exposure = -0.6
    world = bpy.data.worlds.new('Night')
    scene.world = world
    nt = world.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputWorld')
    bg = nt.nodes.new('ShaderNodeBackground')
    coords = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position, ramp.color_ramp.elements[0].color = 0.35, (*NIGHT1, 1)
    ramp.color_ramp.elements[1].position, ramp.color_ramp.elements[1].color = 0.62, (*NIGHT0, 1)
    nt.links.new(coords.outputs['Window'], sep.inputs[0])
    nt.links.new(sep.outputs['Y'], ramp.inputs[0])
    nt.links.new(ramp.outputs[0], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = 0.9
    nt.links.new(bg.outputs[0], out.inputs[0])
    compositor(scene)
    return scene


def compositor(scene):
    """Soft bloom for the river, then four-point streaks for the brightest stars only."""
    ng = bpy.data.node_groups.new('Glow', 'CompositorNodeTree')
    ng.interface.new_socket(name='Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    layers = ng.nodes.new('CompositorNodeRLayers')
    bloom = ng.nodes.new('CompositorNodeGlare')
    bloom.inputs['Type'].default_value = 'Bloom'
    bloom.inputs['Threshold'].default_value = 0.9
    bloom.inputs['Strength'].default_value = 0.45
    bloom.inputs['Size'].default_value = 0.7
    streaks = ng.nodes.new('CompositorNodeGlare')
    streaks.inputs['Type'].default_value = 'Streaks'
    streaks.inputs['Threshold'].default_value = 12.0
    streaks.inputs['Streaks'].default_value = 4
    streaks.inputs['Streaks Angle'].default_value = math.radians(45)
    streaks.inputs['Strength'].default_value = 0.22
    streaks.inputs['Fade'].default_value = 0.82
    out = ng.nodes.new('NodeGroupOutput')
    ng.links.new(layers.outputs['Image'], bloom.inputs['Image'])
    ng.links.new(bloom.outputs['Image'], streaks.inputs['Image'])
    ng.links.new(streaks.outputs['Image'], out.inputs[0])
    scene.compositing_node_group = ng
    scene.render.use_compositing = True


def material(name, build):
    mat = bpy.data.materials.new(name)
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    shader = build(nt)
    nt.links.new(shader, out.inputs['Surface'])
    return mat


def emissive(name, color, strength):
    def build(nt):
        e = nt.nodes.new('ShaderNodeEmission')
        e.inputs['Color'].default_value = (*color, 1)
        e.inputs['Strength'].default_value = strength
        return e.outputs[0]
    return material(name, build)


def principled(name, color, roughness=0.5, emission=None, emission_strength=0.0, rim=None):
    def build(nt):
        p = nt.nodes.new('ShaderNodeBsdfPrincipled')
        p.inputs['Base Color'].default_value = (*color, 1)
        p.inputs['Roughness'].default_value = roughness
        if emission:
            p.inputs['Emission Color'].default_value = (*emission, 1)
            p.inputs['Emission Strength'].default_value = emission_strength
        if not rim:
            return p.outputs[0]
        # A champagne rim so dark birds read against the river.
        weight = nt.nodes.new('ShaderNodeLayerWeight')
        weight.inputs['Blend'].default_value = 0.35
        glow = nt.nodes.new('ShaderNodeEmission')
        glow.inputs['Color'].default_value = (*rim[0], 1)
        glow.inputs['Strength'].default_value = rim[1]
        mix = nt.nodes.new('ShaderNodeMixShader')
        nt.links.new(weight.outputs['Facing'], mix.inputs[0])
        nt.links.new(p.outputs[0], mix.inputs[1])
        nt.links.new(glow.outputs[0], mix.inputs[2])
        return mix.outputs[0]
    return material(name, build)


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def mesh_object(name, bm, mat=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = link(bpy.data.objects.new(name, me))
    if mat:
        obj.data.materials.append(mat)
    return obj


# ---------------------------------------------------------------- the sky

def star_field(count=9000, radius=140.0):
    """Thousands of tiny stars on a sphere, gathered thicker along the river."""
    bm = bmesh.new()
    color = bm.loops.layers.color.new('Col')
    axis = Vector((-0.54, 0.0, 0.84)).normalized()  # the river runs top-left to bottom-right
    for i in range(count):
        v = Vector((random.gauss(0, 1), abs(random.gauss(0, 1)) + 0.25, random.gauss(0, 1))).normalized()
        # Every third star is pulled toward the band so the river is crowded with stars.
        if i % 5 < 2:
            across = Vector((axis.z, 0.0, -axis.x))
            off = v.dot(across)
            v = (v - across * off * 0.9).normalized()
        size = min(0.28, 0.035 + random.expovariate(22.0))
        warm = random.random()
        tint = (1.0, 0.86 + 0.1 * warm, 0.72 + 0.25 * warm) if warm > 0.5 else (0.78, 0.86, 1.0)
        bright = 0.6 + (size * 9) ** 2
        made = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=size)
        bmesh.ops.translate(bm, verts=made['verts'], vec=v * radius)
        faces = {f for vert in made['verts'] for f in vert.link_faces}
        for f in faces:
            for loop in f.loops:
                loop[color] = (*[c * bright for c in tint], 1)

    def build(nt):
        attr = nt.nodes.new('ShaderNodeVertexColor')
        attr.layer_name = 'Col'
        e = nt.nodes.new('ShaderNodeEmission')
        e.inputs['Strength'].default_value = 2.2
        nt.links.new(attr.outputs['Color'], e.inputs['Color'])
        return e.outputs[0]
    return mesh_object('Stars', bm, material('StarGlow', build))


def river_layer(name, depth, seed, strength, width):
    """One translucent sheet of the Milky Way; several at different depths give it parallax."""
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=depth * 1.25)
    obj = mesh_object(name, bm)
    obj.location = (0, depth, 0)
    obj.rotation_euler = (math.radians(90), 0, 0)

    mat = bpy.data.materials.new(name + 'Mat')
    mat.surface_render_method = 'BLENDED'
    nt = mat.node_tree
    nt.nodes.clear()
    n = nt.nodes.new
    out = n('ShaderNodeOutputMaterial')
    coords = n('ShaderNodeTexCoord')
    mapping = n('ShaderNodeMapping')
    mapping.inputs['Rotation'].default_value = (0, 0, math.radians(-57))
    mapping.inputs['Scale'].default_value = (1 / depth, 1 / depth, 1 / depth)
    sep = n('ShaderNodeSeparateXYZ')
    # Gaussian band across the river: exp(-(x / width)^2)
    sq = n('ShaderNodeMath'); sq.operation = 'MULTIPLY'
    div = n('ShaderNodeMath'); div.operation = 'DIVIDE'; div.inputs[1].default_value = -(width ** 2)
    band = n('ShaderNodeMath'); band.operation = 'EXPONENT'
    noise = n('ShaderNodeTexNoise')
    noise.noise_dimensions = '4D'
    noise.inputs['W'].default_value = seed
    noise.inputs['Scale'].default_value = 7.5
    noise.inputs['Detail'].default_value = 15
    noise.inputs['Roughness'].default_value = 0.72
    dust = n('ShaderNodeTexNoise')
    dust.noise_dimensions = '4D'
    dust.inputs['W'].default_value = seed + 7.3
    dust.inputs['Scale'].default_value = 10.0
    dust.inputs['Detail'].default_value = 8
    dust_ramp = n('ShaderNodeValToRGB')
    dust_ramp.color_ramp.elements[0].position, dust_ramp.color_ramp.elements[0].color = 0.45, (0.05, 0.05, 0.05, 1)
    dust_ramp.color_ramp.elements[1].position, dust_ramp.color_ramp.elements[1].color = 0.6, (1, 1, 1, 1)
    glow = n('ShaderNodeMath'); glow.operation = 'MULTIPLY'
    glow2 = n('ShaderNodeMath'); glow2.operation = 'MULTIPLY'
    tone = n('ShaderNodeValToRGB')
    els = tone.color_ramp.elements
    els[0].position, els[0].color = 0.0, (0, 0, 0, 1)
    els[0].position = 0.12
    els[1].position, els[1].color = 0.75, (1.0, 0.86, 0.6, 1)
    mid = els.new(0.3); mid.color = (0.03, 0.09, 0.2, 1)
    warm = els.new(0.52); warm.color = (0.4, 0.3, 0.33, 1)
    emission = n('ShaderNodeEmission')
    emission.inputs['Strength'].default_value = strength
    transparent = n('ShaderNodeBsdfTransparent')
    add = n('ShaderNodeAddShader')
    L = nt.links.new
    L(coords.outputs['Object'], mapping.inputs['Vector'])
    L(mapping.outputs['Vector'], sep.inputs[0])
    L(sep.outputs['X'], sq.inputs[0]); L(sep.outputs['X'], sq.inputs[1])
    L(sq.outputs[0], div.inputs[0]); L(div.outputs[0], band.inputs[0])
    L(mapping.outputs['Vector'], noise.inputs['Vector'])
    L(mapping.outputs['Vector'], dust.inputs['Vector'])
    L(dust.outputs['Fac'], dust_ramp.inputs[0])
    L(band.outputs[0], glow.inputs[0]); L(noise.outputs['Fac'], glow.inputs[1])
    L(glow.outputs[0], glow2.inputs[0]); L(dust_ramp.outputs['Color'], glow2.inputs[1])
    L(glow2.outputs[0], tone.inputs[0])
    L(tone.outputs['Color'], emission.inputs['Color'])
    L(transparent.outputs[0], add.inputs[0]); L(emission.outputs[0], add.inputs[1])
    L(add.outputs[0], out.inputs['Surface'])
    obj.data.materials.append(mat)
    return obj


def bright_star(name, location, color, strength, radius=0.35):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=12, radius=radius)
    obj = mesh_object(name, bm, emissive(name + 'Glow', color, strength))
    obj.location = location
    return obj


# ---------------------------------------------------------------- props

def paper_plane():
    """A classic dart, folded from one sheet."""
    bm = bmesh.new()
    pts = [(0, 1.0, 0), (-0.42, -0.55, 0.06), (-0.05, -0.45, 0), (0, -0.48, -0.16), (0.05, -0.45, 0), (0.42, -0.55, 0.06)]
    v = [bm.verts.new(p) for p in pts]
    for tri in [(0, 1, 2), (0, 2, 3), (0, 3, 4), (0, 4, 5)]:
        bm.faces.new([v[i] for i in tri])
    mat = principled('Paper', PAPER, 0.6, emission=(1.0, 0.93, 0.8), emission_strength=0.45)
    obj = mesh_object('PaperPlane', bm, mat)
    obj.data.materials[0].use_backface_culling = False
    return obj


def magpie(name):
    """A magpie seen from below, wings spread, drawn flat in the picture plane (x right, z up).

    Head points along +z, wings along x. Ink head, primaries and tail; white shoulders and belly.
    """
    ink = bpy.data.materials.get('MagpieInk') or principled('MagpieInk', INK, 0.5, emission=(0.05, 0.08, 0.14), emission_strength=0.5)
    white = bpy.data.materials.get('MagpieWhite') or principled('MagpieWhite', (0.9, 0.9, 0.92), 0.5, emission=(1.0, 0.94, 0.84), emission_strength=0.75)
    gold = bpy.data.materials.get('MagpieGold') or emissive('MagpieGold', CHAMPAGNE_SOFT, 2.2)
    bm = bmesh.new()

    def poly(points, index=0, y=0.0):
        verts = [bm.verts.new((x, y, z)) for x, z in points]
        face = bm.faces.new(verts)
        face.material_index = index
        # A slightly larger gold copy just behind: the light catching the feather edges.
        cx = sum(x for x, _ in points) / len(points)
        cz = sum(z for _, z in points) / len(points)
        halo = [bm.verts.new((cx + (x - cx) * 1.07 + 0.025 * (1 if x > cx else -1), y + 0.04, cz + (z - cz) * 1.07)) for x, z in points]
        bm.faces.new(halo).material_index = 2

    def ellipse(cx, cz, rx, rz, n=16):
        return [(cx + rx * math.cos(2 * math.pi * i / n), cz + rz * math.sin(2 * math.pi * i / n)) for i in range(n)]

    poly(ellipse(0, 0.0, 0.2, 0.55), 1, -0.02)        # white belly
    poly(ellipse(0, 0.66, 0.17, 0.19), 0, -0.03)      # head
    poly([(0, 1.02), (-0.06, 0.8), (0.06, 0.8)], 0)   # beak
    poly([(-0.1, -0.45), (0.1, -0.45), (0.26, -1.75), (0.0, -1.95), (-0.26, -1.75)], 0)  # long tail
    for side in (-1, 1):
        shoulder = [(0.12, 0.3), (0.95, 0.42), (1.05, 0.02), (0.12, -0.18)]
        primaries = [(0.95, 0.42), (1.6, 0.58), (2.15, 0.48), (2.05, 0.3), (1.85, 0.18), (1.7, 0.02), (1.45, -0.06), (1.05, 0.02)]
        for pts, index in ((shoulder, 1), (primaries, 0)):
            pts = [(side * x, z) for x, z in pts]
            poly(pts if side > 0 else list(reversed(pts)), index, 0.01)
    obj = mesh_object(name, bm)
    obj.data.materials.append(ink)
    obj.data.materials.append(white)
    obj.data.materials.append(gold)
    for m in obj.data.materials:
        m.use_backface_culling = False
    return obj


def envelope(open_amount):
    """Cream envelope, flap hinged at the top edge, sealed with the A&N wax seal."""
    paper = principled('EnvelopePaper', PAPER, 0.85)
    inner = principled('EnvelopeInner', (0.93, 0.83, 0.66), 0.8, emission=(1.0, 0.78, 0.45), emission_strength=1.4 * open_amount)
    w, h = 3.4, 2.15
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=(w, 0.05, h), verts=bm.verts)
    body = mesh_object('Envelope', bm, paper)
    # The glowing inside shows once the flap lifts.
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
    bmesh.ops.scale(bm, vec=(w * 0.96, h * 0.9, 1), verts=bm.verts)
    lining = mesh_object('Lining', bm, inner)
    lining.rotation_euler = (math.radians(90), 0, 0)
    lining.location = (0, -0.03, 0.02)
    lining.parent = body
    # Front pocket folds.
    bm = bmesh.new()
    v = [bm.verts.new(p) for p in [(-w / 2, -0.06, -h / 2), (w / 2, -0.06, -h / 2), (w / 2, -0.06, h / 2 - 0.02), (0, -0.06, -0.05), (-w / 2, -0.06, h / 2 - 0.02)]]
    bm.faces.new(v)
    pocket = mesh_object('Pocket', bm, principled('Pocket', (0.97, 0.9, 0.79), 0.85))
    pocket.parent = body
    # Flap: a triangle hinged on the top edge.
    hinge = link(bpy.data.objects.new('FlapHinge', None))
    hinge.location = (0, -0.07, h / 2)
    hinge.parent = body
    bm = bmesh.new()
    v = [bm.verts.new(p) for p in [(-w / 2, 0, 0), (w / 2, 0, 0), (0, 0, -h * 0.62)]]
    bm.faces.new(v)
    flap = mesh_object('Flap', bm, principled('Flap', (0.99, 0.94, 0.85), 0.8))
    flap.parent = hinge
    flap.data.materials[0].use_backface_culling = False
    hinge.rotation_euler = (math.radians(-165 * open_amount), 0, 0)
    seal_pieces(body, hinge, h, open_amount)
    # Warm light spilling out once open.
    if open_amount > 0:
        light = bpy.data.lights.new('Spill', 'POINT')
        light.energy = 900 * open_amount
        light.color = (1.0, 0.8, 0.5)
        light.shadow_soft_size = 0.8
        lamp = link(bpy.data.objects.new('Spill', light))
        lamp.location = (0, -0.3, 0.9)
        lamp.parent = body
    return body


def seal_pieces(body, hinge, h, open_amount):
    img = bpy.data.images.load(str(MONOGRAM))

    def build(nt):
        n = nt.nodes.new
        p = n('ShaderNodeBsdfPrincipled')
        p.inputs['Base Color'].default_value = (0.86, 0.6, 0.24, 1)
        p.inputs['Metallic'].default_value = 0.55
        p.inputs['Roughness'].default_value = 0.26
        tex = n('ShaderNodeTexImage'); tex.image = img; tex.extension = 'CLIP'
        coords = n('ShaderNodeTexCoord')
        mapping = n('ShaderNodeMapping')
        mapping.inputs['Location'].default_value = (0.5, 0.5, 0)
        mapping.inputs['Scale'].default_value = (1.35, 1.35 * 1.48, 1)
        mapping.inputs['Rotation'].default_value = (math.radians(-90), 0, 0)
        rgb = n('ShaderNodeRGBToBW')
        inv = n('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0
        bump = n('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.8; bump.inputs['Distance'].default_value = 0.02
        darker = n('ShaderNodeMix'); darker.data_type = 'RGBA'
        darker.inputs['A'].default_value = (0.86, 0.6, 0.24, 1)
        darker.inputs['B'].default_value = (0.42, 0.24, 0.07, 1)
        L = nt.links.new
        L(coords.outputs['Object'], mapping.inputs['Vector'])
        L(mapping.outputs['Vector'], tex.inputs['Vector'])
        L(tex.outputs['Color'], rgb.inputs[0])
        L(rgb.outputs[0], inv.inputs[1])
        L(inv.outputs[0], bump.inputs['Height'])
        L(inv.outputs[0], darker.inputs['Factor'])
        L(darker.outputs['Result'], p.inputs['Base Color'])
        L(bump.outputs['Normal'], p.inputs['Normal'])
        return p.outputs[0]
    wax = material('Wax', build)

    def disc(name, keep):
        bm = bmesh.new()
        ring = []
        for i in range(72):
            a = 2 * math.pi * i / 72
            r = 0.46 + 0.012 * math.sin(a * 11) + 0.006 * math.sin(a * 29)
            x, z = r * math.cos(a), r * math.sin(a)
            if keep(x, z):
                ring.append((x, z))
        top = [bm.verts.new((x, -0.05, z)) for x, z in ring]
        bot = [bm.verts.new((x, 0.0, z)) for x, z in ring]
        bm.faces.new(top)
        bm.faces.new(list(reversed(bot)))
        for i in range(len(ring)):
            j = (i + 1) % len(ring)
            bm.faces.new([top[i], top[j], bot[j], bot[i]])
        obj = mesh_object(name, bm, wax)
        for poly in obj.data.polygons:
            poly.use_smooth = True
        return obj

    if open_amount == 0:
        seal = disc('Seal', lambda x, z: True)
        seal.parent = hinge
        seal.location = (0, -0.03, -h * 0.55)
        return
    # Broken: two halves along a jagged crack, falling away from the opened flap.
    crack = lambda x: 0.06 * math.sin(x * 19) + 0.03 * math.sin(x * 41)
    left = disc('SealLeft', lambda x, z: x < crack(z))
    right = disc('SealRight', lambda x, z: x > crack(z))
    for half, side in ((left, -1), (right, 1)):
        half.parent = body
        half.location = (side * 0.55, -0.45, -0.25 - 0.15 * (side > 0))
        half.rotation_euler = (math.radians(20), math.radians(side * 28), math.radians(side * 12))


# ---------------------------------------------------------------- the world

def camera(name, location, rotation, lens=35):
    cam = bpy.data.cameras.new(name)
    cam.lens = lens
    cam.clip_end = 400
    obj = link(bpy.data.objects.new(name, cam))
    obj.location = location
    obj.rotation_euler = Euler([math.radians(a) for a in rotation])
    return obj


def sky():
    star_field()
    for i, (depth, strength, width) in enumerate([(28, 0.3, 0.05), (40, 0.5, 0.07), (56, 0.65, 0.09), (76, 0.55, 0.12), (95, 0.35, 0.24)]):
        river_layer(f'River{i}', depth, seed=3.1 * i + 1.7, strength=strength, width=width)
    altair = bright_star('Altair', (-9.5, 46, -14), (1.0, 0.9, 0.76), 70, 0.3)
    vega = bright_star('Vega', (10.0, 46, 15), (0.8, 0.88, 1.0), 85, 0.32)
    deneb = bright_star('Deneb', (-11.5, 60, 20), (0.95, 0.95, 1.0), 18, 0.24)
    sun = bpy.data.lights.new('Key', 'SUN')
    sun.energy = 2.2
    sun.color = (1.0, 0.86, 0.66)
    key = link(bpy.data.objects.new('Key', sun))
    key.rotation_euler = (math.radians(-40), math.radians(35), math.radians(15))
    return altair, vega, deneb


def bridge_points(altair, vega, count, bow=8.0, depth=-4.0):
    """Magpies along an arch from Altair to Vega, bowing toward Deneb across the river."""
    a, b = Vector(altair.location), Vector(vega.location)
    span = b - a
    perp = Vector((-span.z, 0.0, span.x)).normalized()  # toward the upper left, where Deneb is
    mid = (a + b) / 2 + perp * bow + Vector((0, depth, 0))
    pts = []
    for i in range(count):
        t = 0.06 + 0.88 * i / (count - 1)
        p = (1 - t) ** 2 * a + 2 * (1 - t) * t * mid + t ** 2 * b
        tangent = 2 * (1 - t) * (mid - a) + 2 * t * (b - mid)
        pts.append((p, tangent.normalized()))
    return pts


def facing(bird, angle):
    """Point the bird's head at angle (radians, from +x toward +z) in the picture plane."""
    bird.rotation_euler = (0, math.radians(90) - angle, 0)


def place_magpies(altair, vega, arranged):
    """B2: wing-tip to wing-tip along the arch, heads up. B1: the same birds, still rising."""
    birds = []
    pts = bridge_points(altair, vega, 7)
    for i, (p, tangent) in enumerate(pts):
        bird = magpie(f'Magpie{i:02d}')
        along = math.atan2(tangent.z, tangent.x)
        if arranged:
            bird.location = p
            facing(bird, along + math.radians(90) + random.uniform(-0.06, 0.06))
            s = 1.75
        else:
            bird.location = p + Vector((random.uniform(-2, 6), random.uniform(0, 5), random.uniform(-10, -3)))
            facing(bird, along + math.radians(90) + math.radians(random.uniform(-55, 55)))
            s = random.uniform(1.1, 1.4)
        bird.scale = (s, s, s)
        birds.append(bird)
    return birds


# ---------------------------------------------------------------- keyframes

def key_A(end):
    """The Silver River. A1: wide, a paper plane sets off. A2: the camera has flown into the river."""
    sky()
    plane = paper_plane()
    if not end:
        cam = camera('Cam', (0, -14, 0), (90, 0, 0))
        plane.location = (0.9, -8.0, -2.0)
        plane.rotation_euler = (math.radians(35), math.radians(-30), math.radians(38))
        plane.scale = (0.42,) * 3
    else:
        cam = camera('Cam', (0.4, 3.0, -0.6), (90.5, 0, 0), lens=30)
        plane.location = (-0.5, 17.0, -1.2)
        plane.rotation_euler = (math.radians(78), math.radians(-12), math.radians(28))
        plane.scale = (0.85,) * 3
    bpy.context.scene.camera = cam


def key_B(end):
    """The magpies. B1: they rise out of the river. B2: the bridge is made, Deneb lights."""
    altair, vega, deneb = sky()
    cam = camera('Cam', (0.4, 3.0, -0.6), (90.5, 0, 0), lens=30)
    bpy.context.scene.camera = cam
    place_magpies(altair, vega, arranged=end)
    if end:
        deneb.data.materials[0].node_tree.nodes['Emission'].inputs['Strength'].default_value = 600
        meeting = bpy.data.lights.new('Meeting', 'POINT')
        meeting.energy = 3500
        meeting.color = (1.0, 0.78, 0.6)
        meeting.shadow_soft_size = 2.0
        lamp = link(bpy.data.objects.new('Meeting', meeting))
        lamp.location = bridge_points(altair, vega, 7)[3][0] + Vector((0, -2.0, 0))


def key_C(end):
    """The seal. C1: the envelope waits among the stars. C2: the seal breaks, light spills out."""
    sky()
    body = envelope(1.0 if end else 0.0)
    body.location = (-0.12, -20, -0.3)
    body.rotation_euler = (math.radians(-6), math.radians(4), math.radians(-5))
    cam = camera('Cam', (0, -29.5, 0.6), (88, 0, 0), lens=41)
    key = bpy.data.lights.new('Front', 'AREA')
    key.energy = 650
    key.size = 6
    key.color = (1.0, 0.9, 0.78)
    front = link(bpy.data.objects.new('Front', key))
    front.location = (2.5, -25.5, 3.5)
    front.rotation_euler = (math.radians(55), math.radians(20), 0)
    bpy.context.scene.camera = cam
    fill = bpy.data.lights.new('Rim', 'AREA')
    fill.energy = 220
    fill.size = 4
    fill.color = (0.75, 0.82, 1.0)
    rim = link(bpy.data.objects.new('Rim', fill))
    rim.location = (-3.5, -16.5, 3.0)
    rim.rotation_euler = (math.radians(-60), math.radians(-30), 0)


KEYS = {'A1': (key_A, False), 'A2': (key_A, True), 'B1': (key_B, False), 'B2': (key_B, True), 'C1': (key_C, False), 'C2': (key_C, True)}

def export_props():
    """Geometry for the live scene. Materials are rebuilt in three.js; names are the contract."""
    reset()
    plane = paper_plane()
    plane.location = (-4, 0, 0)
    bird = magpie('Magpie')
    bird.location = (4, 0, 0)
    closed = envelope(0.0)
    closed.name = 'EnvelopeClosed'
    closed.location = (0, 0, 4)
    broken = envelope(1.0)
    broken.name = 'EnvelopeOpen'
    broken.location = (0, 0, -4)
    target = ROOT / 'public' / 'models' / 'props.glb'
    target.parent.mkdir(parents=True, exist_ok=True)
    for obj in bpy.context.scene.objects:
        obj.select_set(obj.type == 'MESH' or obj.type == 'EMPTY')
    bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True, export_lights=False,
                              export_cameras=False, export_apply=True, export_yup=True, export_draco_mesh_compression_enable=False)
    print(f'EXPORTED {target} ({target.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    keys, scale, save = args()
    OUT.mkdir(parents=True, exist_ok=True)
    if keys == ['EXPORT']:
        export_props()
        sys.exit(0)
    for key in keys:
        scene = reset()
        random.seed(214)
        build, end = KEYS[key]
        build(end)
        scene.render.resolution_percentage = int(100 * scale)
        scene.render.filepath = str(OUT / f'{key}.png')
        bpy.ops.render.render(write_still=True)
        print(f'RENDERED {key} -> {scene.render.filepath}')
        if save:
            bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'blender' / f'{key}.blend'))
