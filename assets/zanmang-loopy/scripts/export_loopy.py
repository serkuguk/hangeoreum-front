"""Export only the prototype, with named NLA clips, from the saved Blender source."""
import bpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'blender/zanmang_loopy.blend'))
collection = bpy.data.collections['LoopyPrototype']
rig = bpy.data.objects['LP_Rig']
bpy.ops.object.select_all(action='DESELECT')
for obj in collection.objects:
    if obj.type in ('MESH', 'ARMATURE'):
        obj.select_set(True)
        if obj.type == 'MESH':
            world = obj.matrix_world.copy()
            obj.parent = None
            obj.matrix_world = world
bpy.context.view_layer.objects.active = rig
# glTF skinned meshes are scene roots with identity transforms; bone skinning owns their motion.
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
rig.animation_data.action = None
for track in rig.animation_data.nla_tracks:
    track.mute = False
for bone in rig.pose.bones:
    bone.rotation_euler = (0, 0, 0)
    bone.location = (0, 0, 0)
    bone.scale = (1, 1, 1)
bpy.ops.export_scene.gltf(
    filepath=str(ROOT / 'exports/3d/zanmang_loopy.glb'), export_format='GLB',
    use_selection=True, export_cameras=False, export_lights=False,
    export_animations=True, export_animation_mode='NLA_TRACKS',
    export_skins=True, export_morph=True, export_force_sampling=True,
    export_optimize_animation_size=True, export_texcoords=False,
)
print('LOOPY_EXPORT_OK')
