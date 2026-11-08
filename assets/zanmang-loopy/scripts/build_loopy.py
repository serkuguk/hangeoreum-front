"""Blender 5.2: reproduce the user's turnaround as an editable, rigged local prototype.

Run: blender --background --factory-startup --python assets/zanmang-loopy/scripts/build_loopy.py
Only the LoopyPrototype collection and LP_ datablocks belong to this script.
"""
import bpy
import math
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'LP_'
CLIPS = {'Idle': 48, 'Wave': 48, 'Walk': 32, 'Point': 48, 'Celebrate': 48, 'Sad': 48}
scene = bpy.context.scene


def material(name, hex_color):
    color = [int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    linear = [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in color]
    mat = bpy.data.materials.new(PREFIX + name)
    mat.diffuse_color = (*linear, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*linear, 1)
    bsdf.inputs['Roughness'].default_value = .72
    bsdf.inputs['Specular IOR Level'].default_value = .22
    return mat


def own(obj, name):
    obj.name = PREFIX + name
    if obj.data:
        obj.data.name = PREFIX + name
    for source_collection in list(obj.users_collection):
        source_collection.objects.unlink(obj)
    collection.objects.link(obj)
    return obj


def mesh(name, vertices, faces, mat):
    data = bpy.data.meshes.new(PREFIX + name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = own(bpy.data.objects.new(PREFIX + name, data), name)
    obj.data.materials.append(mat)
    for polygon in data.polygons:
        polygon.use_smooth = True
    return obj


def sphere(name, location, scale, mat, segments=20, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = own(bpy.context.object, name)
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def bind(obj, bone):
    group = obj.vertex_groups.new(name=bone)
    group.add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
    modifier = obj.modifiers.new('Armature', 'ARMATURE')
    modifier.object = rig
    obj.parent = rig
    # Keep original world-space placement when parenting the identity-transform rig.


def arm(side, sign):
    start, end = Vector((sign * .38, 0, 1.27)), Vector((sign * .73, -.04, .64))
    axis = (end - start).normalized()
    u = axis.cross(Vector((0, 1, 0))).normalized()
    v = axis.cross(u).normalized()
    verts, faces = [], []
    for row in range(17):
        t = row / 16
        radius = .146 * max(.04, math.sin(math.pi * t)) ** .35
        for col in range(20):
            angle = math.tau * col / 20
            verts.append(start.lerp(end, t) + radius * (math.cos(angle) * u + math.sin(angle) * v))
            if row:
                p, q = row * 20 + col, row * 20 + (col + 1) % 20
                faces.append((p - 20, q - 20, q, p))
    obj = mesh('ArmMesh.' + side, verts, faces, skin)
    upper = obj.vertex_groups.new(name='Arm.' + side)
    lower = obj.vertex_groups.new(name='Forearm.' + side)
    for row in range(17):
        weight = max(0, min(1, (row / 16 - .32) / .36))
        indices = list(range(row * 20, (row + 1) * 20))
        upper.add(indices, 1 - weight, 'REPLACE')
        lower.add(indices, weight, 'REPLACE')
    obj.modifiers.new('Armature', 'ARMATURE').object = rig
    obj.parent = rig


def profile_radius(z, index, dimension):
    # Monotone Hermite interpolation keeps the reference cheek contour smooth without overshoot.
    def slope(i):
        if i == 0 or i == len(profile) - 1:
            return (profile[min(i + 1, len(profile) - 1)][dimension] - profile[max(0, i - 1)][dimension]) / (profile[min(i + 1, len(profile) - 1)][0] - profile[max(0, i - 1)][0])
        a = (profile[i][dimension] - profile[i - 1][dimension]) / (profile[i][0] - profile[i - 1][0])
        b = (profile[i + 1][dimension] - profile[i][dimension]) / (profile[i + 1][0] - profile[i][0])
        return 2 * a * b / (a + b) if a * b > 0 else 0
    a, b = profile[index], profile[index + 1]
    width = b[0] - a[0]
    t = (z - a[0]) / width
    return (2 * t ** 3 - 3 * t ** 2 + 1) * a[dimension] + (t ** 3 - 2 * t ** 2 + t) * width * slope(index) + (-2 * t ** 3 + 3 * t ** 2) * b[dimension] + (t ** 3 - t ** 2) * width * slope(index + 1)


def camera(name, position, target=(0, 0, 1.65), ortho=3.8):
    data = bpy.data.cameras.new(PREFIX + name)
    obj = own(bpy.data.objects.new(PREFIX + name, data), name)
    obj.location = position
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    data.type = 'ORTHO'
    data.ortho_scale = ortho
    return obj


def light(name, position, energy, size):
    data = bpy.data.lights.new(PREFIX + name, 'AREA')
    data.energy, data.shape, data.size = energy, 'DISK', size
    obj = own(bpy.data.objects.new(PREFIX + name, data), name)
    obj.location = position
    obj.rotation_euler = (Vector((0, 0, 1.6)) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def reset_pose():
    for bone in rig.pose.bones:
        bone.rotation_mode = 'XYZ'
        bone.rotation_euler = (0, 0, 0)
        bone.location = (0, 0, 0)
        bone.scale = (1, 1, 1)


def pose(clip, t):
    reset_pose()
    bones = rig.pose.bones
    cycle = math.sin(t * math.tau)
    envelope = math.sin(math.pi * t) ** 2
    if clip == 'Idle':
        bones['Body'].scale = (1 + .008 * cycle, 1 + .008 * cycle, 1 + .012 * cycle)
        bones['Head'].rotation_euler[1] = .025 * cycle
    elif clip == 'Wave':
        bones['Arm.R'].rotation_euler[2] = -1.8 * envelope
        bones['Forearm.R'].rotation_euler[2] = -.45 * envelope + .22 * math.sin(t * math.tau * 3) * envelope
        bones['Head'].rotation_euler[1] = -.08 * envelope
    elif clip == 'Walk':
        # Short hidden legs step via bone translation; local Y points down toward each foot.
        # Root stays fixed so the site controls movement independently from the gait.
        for side, phase in (('L', cycle), ('R', -cycle)):
            bones['Leg.' + side].location[1] = -.12 * max(0, phase)
            bones['Leg.' + side].location[2] = .065 * phase
            bones['Foot.' + side].rotation_euler[0] = .15 * max(0, phase)
        bones['Arm.L'].rotation_euler[0] = -.18 * cycle
        bones['Arm.R'].rotation_euler[0] = .18 * cycle
        bones['Body'].rotation_euler[1] = .025 * cycle
    elif clip == 'Point':
        bones['Arm.R'].rotation_euler[2] = -1.18 * envelope
        bones['Forearm.R'].rotation_euler[2] = .14 * envelope
        bones['Head'].rotation_euler[1] = -.12 * envelope
    elif clip == 'Celebrate':
        bones['Arm.R'].rotation_euler[2] = -1.85 * envelope
        bones['Arm.L'].rotation_euler[2] = 1.85 * envelope
        bones['Body'].location[1] = .06 * abs(math.sin(t * math.tau * 2)) * envelope
        bones['Head'].rotation_euler[1] = .08 * math.sin(t * math.tau * 2) * envelope
    elif clip == 'Sad':
        bones['Head'].rotation_euler[0] = .18 * envelope
        bones['Body'].rotation_euler[0] = .08 * envelope
        bones['Arm.L'].rotation_euler[2] = -.1 * envelope
        bones['Arm.R'].rotation_euler[2] = .1 * envelope
    if clip in ('Celebrate', 'Sad'):
        bones['Mouth'].scale[2] = 1 + (.7 if clip == 'Celebrate' else -.35) * envelope


def render(path, cam=None, resolution=640):
    scene.camera = cam or cameras['Front']
    scene.render.resolution_x = scene.render.resolution_y = resolution
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


# Idempotence is scoped: never delete another collection or the user's scene contents.
old = bpy.data.collections.get('LoopyPrototype')
if old:
    for obj in list(old.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.collections.remove(old)
for database in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.actions, bpy.data.cameras, bpy.data.lights):
    for block in list(database):
        if block.name.startswith(PREFIX) and block.users <= int(block.use_fake_user):
            database.remove(block)
collection = bpy.data.collections.new('LoopyPrototype')
scene.collection.children.link(collection)
skin = material('Skin', 'FFB6C6')
inner = material('EarInner', 'F9D9E2')
plum = material('NoseFeet', 'B22768')
eye_mat = material('Eyes', '59132C')
mouth_mat = material('Mouth', 'A84959')
white = material('White', 'FEFEFE')

armature = bpy.data.armatures.new(PREFIX + 'Skeleton')
rig = own(bpy.data.objects.new(PREFIX + 'Rig', armature), 'Rig')
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
definitions = [
    ('Root', (0, 0, 0), (0, 0, .3), None),
    ('Body', (0, 0, .45), (0, 0, 1.4), 'Root'),
    ('Head', (0, 0, 1.4), (0, 0, 2.7), 'Body'),
    ('Mouth', (0, -.65, 1.67), (0, -.65, 1.78), 'Head'),
]
for side, sign in [('L', -1), ('R', 1)]:
    definitions += [
        ('Arm.' + side, (sign * .38, 0, 1.27), (sign * .57, -.02, .96), 'Body'),
        ('Forearm.' + side, (sign * .57, -.02, .96), (sign * .73, -.04, .64), 'Arm.' + side),
        ('Leg.' + side, (sign * .29, 0, .47), (sign * .29, 0, .19), 'Root'),
        ('Foot.' + side, (sign * .29, 0, .19), (sign * .29, -.22, .12), 'Leg.' + side),
    ]
for name, head, tail, parent in definitions:
    bone = armature.edit_bones.new(name)
    bone.head, bone.tail = head, tail
    if parent:
        bone.parent = armature.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
rig.show_in_front = True

body = sphere('Body', (0, 0, .85), (.53, .49, .65), skin, 40, 24)
bind(body, 'Body')
# Ring profile follows the broad lower cheeks and narrower crown in the supplied sheet.
profile = [(-.82, 0, 0), (-.74, .48, .28), (-.56, .77, .44), (-.3, .88, .50),
           (0, .82, .54), (.3, .75, .50), (.55, .62, .41), (.74, .37, .24), (.82, 0, 0)]
vertices, faces = [], []
for row in range(49):
    z = -.82 + 1.64 * row / 48
    index = next((i for i in range(len(profile) - 1) if z <= profile[i + 1][0]), len(profile) - 2)
    rx, ry = (profile_radius(z, index, j) for j in (1, 2))
    for column in range(48):
        angle = math.tau * column / 48
        vertices.append((rx * math.cos(angle), 1.45 * ry * math.sin(angle), 2.19 + z))
        if row:
            p = row * 48 + column
            q = row * 48 + (column + 1) % 48
            faces.append((p - 48, q - 48, q, p))
head = mesh('Head', vertices, faces, skin)
# Weld the collapsed pole rings rather than exporting degenerate triangles.
bpy.context.view_layer.objects.active = head
bpy.ops.object.select_all(action='DESELECT')
head.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=.00001)
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode='OBJECT')
bind(head, 'Head')

# A surface patch follows the belly instead of a white floating sphere.
verts = [(0, -.498, .82)]
patch_faces = []
for ring in range(1, 9):
    for col in range(40):
        angle = math.tau * col / 40
        x, z = .355 * ring / 8 * math.cos(angle), .82 + .43 * ring / 8 * math.sin(angle)
        y = -.49 * math.sqrt(max(0, 1 - (x / .53) ** 2 - ((z - .85) / .65) ** 2)) - .008
        verts.append((x, y, z))
        if ring == 1:
            patch_faces.append((0, 1 + col, 1 + (col + 1) % 40))
        else:
            p, q = 1 + (ring - 1) * 40 + col, 1 + (ring - 1) * 40 + (col + 1) % 40
            patch_faces.append((p - 40, p, q, q - 40))
belly = mesh('BellyPatch', verts, patch_faces, white)
bind(belly, 'Body')

for side, sign in [('L', -1), ('R', 1)]:
    bind(sphere('Ear.' + side, (sign * .62, .015, 2.77), (.19, .115, .195), skin), 'Head')
    bind(sphere('EarInner.' + side, (sign * .62, -.082, 2.77), (.114, .028, .12), inner), 'Head')
    bind(sphere('Eye.' + side, (sign * .285, -.748, 2.215), (.086, .045, .09), eye_mat), 'Head')
    bind(sphere('EyeGlint.' + side, (sign * .285 - .025, -.787, 2.245), (.026, .012, .026), white, 16, 10), 'Head')
    arm(side, sign)
    bind(sphere('Hand.' + side, (sign * .73, -.04, .64), (.145, .14, .15), skin), 'Forearm.' + side)
    for digit in range(3):
        bind(sphere('Finger.%s.%d' % (side, digit), (sign * (.66 + digit * .064), -.145, .565 + abs(digit - 1) * .03),
                    (.036, .028, .044), plum, 16, 10), 'Forearm.' + side)
    bind(sphere('Foot.' + side, (sign * .29, -.09, .125), (.265, .29, .125), plum), 'Foot.' + side)
    for digit in range(3):
        bind(sphere('Toe.%s.%d' % (side, digit), (sign * .29 + (digit - 1) * .12, -.287, .115),
                    (.09, .105, .095), plum, 16, 10), 'Foot.' + side)

bind(sphere('Nose', (0, -.795, 1.985), (.175, .105, .135), plum, 32, 20), 'Head')
bind(sphere('Mouth', (0, -.651, 1.675), (.185, .035, .058), mouth_mat), 'Mouth')
for sign in (-1, 1):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(sign * .037, -.681, 1.686))
    tooth = own(bpy.context.object, 'Tooth.' + str(sign))
    tooth.scale = (.075, .043, .065)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = tooth.modifiers.new('Soft tooth edges', 'BEVEL')
    bevel.width, bevel.segments = .014, 3
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    tooth.data.materials.append(white)
    bind(tooth, 'Mouth')
for name, location, scale, angle in [
    ('TuftTall', (-.045, .01, 3.12), (.083, .075, .23), -.13),
    ('TuftShort', (.075, .01, 3.075), (.075, .07, .145), .52),
]:
    obj = sphere(name, location, scale, skin)
    obj.rotation_euler[1] = angle
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    bind(obj, 'Head')

rig.animation_data_create()
scene.render.fps = 24
for clip, end in CLIPS.items():
    action = bpy.data.actions.new(PREFIX + clip)
    action.use_fake_user = True
    rig.animation_data.action = action
    for frame in range(1, end + 1):
        pose(clip, (frame - 1) / (end - 1))
        for bone in rig.pose.bones:
            for path in ('rotation_euler', 'location', 'scale'):
                bone.keyframe_insert(data_path=path, frame=frame, group=bone.name)
    action.use_frame_range = True
    action.frame_start, action.frame_end = 1, end
    # NLA track names become stable glTF clip names; mute tracks for neutral inspection.
    track = rig.animation_data.nla_tracks.new()
    track.name = clip
    strip = track.strips.new(clip, 1, action)
    if hasattr(strip, 'action_slot'):
        strip.action_slot = action.slots[0]
    track.mute = True
rig.animation_data.action = None
reset_pose()
scene.frame_start, scene.frame_end = 1, 48
scene.frame_set(1)

cameras = {
    'Front': camera('CameraFront', (0, -8, 1.65)),
    'FrontThreeQuarter': camera('CameraFrontThreeQuarter', (5.66, -5.66, 1.65)),
    'Side': camera('CameraSide', (8, 0, 1.65)),
    'BackThreeQuarter': camera('CameraBackThreeQuarter', (5.66, 5.66, 1.65)),
    'Back': camera('CameraBack', (0, 8, 1.65)),
}
light('Key', (-3.5, -4, 6), 430, 5)
light('Fill', (4, -2, 4), 280, 4)
light('Rim', (1, 3, 5), 180, 4)
scene.camera = cameras['Front']
scene.render.engine = 'CYCLES'
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.world.color = (.3, .3, .3)
scene.render.resolution_x = scene.render.resolution_y = 640
hidden = [(obj, obj.hide_render, obj.hide_viewport) for obj in scene.objects if obj.name not in collection.objects]
for obj, _, _ in hidden:
    obj.hide_render = obj.hide_viewport = True

for directory in ('blender', 'exports/2d', 'exports/3d', 'concept', 'docs/inspection'):
    (ROOT / directory).mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
scene['loopy_reference'] = 'references/turnaround-user.png; user supplied, official status unverified'
scene['loopy_inferred'] = 'Hidden surfaces, depth, joints and expressions are reconstructed. No tail in source.'
rig.animation_data.action = bpy.data.actions[PREFIX + 'Idle']
rig.animation_data.action_slot = rig.animation_data.action.slots[0]
scene.frame_set(1)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'blender/zanmang_loopy.blend'))

if '--no-render' not in sys.argv:
    for label, cam in cameras.items():
        render(ROOT / ('docs/inspection/view-' + label + '.png'), cam)
    poses = {'neutral': ('Idle', 1), 'hello': ('Wave', 24), 'happy': ('Celebrate', 24),
             'thinking': ('Point', 17), 'sad': ('Sad', 24), 'pointing': ('Point', 24)}
    for label, (clip, frame) in poses.items():
        reset_pose()
        rig.animation_data.action = bpy.data.actions[PREFIX + clip]
        rig.animation_data.action_slot = rig.animation_data.action.slots[0]
        scene.frame_set(frame)
        if label == 'thinking':
            rig.animation_data.action = None
            reset_pose()
            rig.pose.bones['Arm.R'].rotation_euler[2] = -.7
            rig.pose.bones['Forearm.R'].rotation_euler[2] = -1.9
            rig.pose.bones['Head'].rotation_euler[1] = -.12
        render(ROOT / ('exports/2d/' + label + '.png'))
    for clip, end in CLIPS.items():
        rig.animation_data.action = bpy.data.actions[PREFIX + clip]
        rig.animation_data.action_slot = rig.animation_data.action.slots[0]
        for index, frame in enumerate((1, end // 4, end // 2, 3 * end // 4, end)):
            scene.frame_set(frame)
            render(ROOT / ('docs/inspection/clip-%s-%d.png' % (clip, index)), resolution=320)
    rig.animation_data.action = None
    for label in ('smiling', 'surprised'):
        reset_pose()
        rig.pose.bones['Mouth'].scale = (1.15, 1, .75) if label == 'smiling' else (.65, 1, 2.2)
        render(ROOT / ('docs/inspection/expression-' + label + '.png'))
    reset_pose()
    scene.frame_set(1)
    render(ROOT / 'docs/inspection/neutral.png')
for obj, hide_render, hide_viewport in hidden:
    obj.hide_render, obj.hide_viewport = hide_render, hide_viewport
print('LOOPY_BUILD_OK', len(collection.objects), 'objects;', len(CLIPS), 'clips')
