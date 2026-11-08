"""Runnable regression check. Python: GLB checks; Blender: additionally rebuild twice and sample poses."""
import json
import math
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = {'Idle', 'Wave', 'Walk', 'Point', 'Celebrate', 'Sad'}


def check_glb():
    data = (ROOT / 'exports/3d/zanmang_loopy.glb').read_bytes()
    magic, version, total = struct.unpack_from('<4sII', data)
    assert (magic, version, total) == (b'glTF', 2, len(data))
    length, kind = struct.unpack_from('<II', data, 12)
    assert kind == 0x4E4F534A
    gltf = json.loads(data[20:20 + length])
    binary_length, binary_kind = struct.unpack_from('<II', data, 20 + length)
    assert binary_kind == 0x004E4942
    binary = data[28 + length:28 + length + binary_length]
    assert len(binary) == binary_length
    assert gltf['asset']['version'] == '2.0'
    assert gltf['skins'] and all(len(s['joints']) >= 10 for s in gltf['skins'])
    assert not gltf.get('images'), 'Prototype intentionally needs no textures'

    def values(index):
        accessor = gltf['accessors'][index]
        view = gltf['bufferViews'][accessor['bufferView']]
        fmt = {5126: 'f', 5125: 'I', 5123: 'H', 5121: 'B'}[accessor['componentType']]
        width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[accessor['type']]
        stride = view.get('byteStride', struct.calcsize('<' + fmt) * width)
        start = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
        return [struct.unpack_from('<' + fmt * width, binary, start + i * stride) for i in range(accessor['count'])]

    triangles = 0
    for mesh in gltf['meshes']:
        for primitive in mesh['primitives']:
            assert primitive.get('mode', 4) == 4
            positions = values(primitive['attributes']['POSITION'])
            indices = values(primitive['indices'])
            assert len(indices) % 3 == 0
            assert all(0 <= i[0] < len(positions) for i in indices)
            assert all(math.isfinite(v) for p in positions for v in p)
            assert 'JOINTS_0' in primitive['attributes'] and 'WEIGHTS_0' in primitive['attributes']
            weights = values(primitive['attributes']['WEIGHTS_0'])
            assert all(abs(sum(w) - 1) < .001 for w in weights)
            triangles += len(indices) // 3
    assert {a['name'] for a in gltf['animations']} == EXPECTED
    durations = {}
    for animation in gltf['animations']:
        assert animation['channels'] and animation['samplers']
        changed = False
        for sampler in animation['samplers']:
            times = [v[0] for v in values(sampler['input'])]
            outputs = values(sampler['output'])
            assert len(times) > 1 and all(b > a for a, b in zip(times, times[1:]))
            assert all(math.isfinite(v) for p in outputs for v in p)
            changed |= any(any(abs(v - first) > .0001 for v, first in zip(p, outputs[0])) for p in outputs[1:])
            durations[animation['name']] = max(durations.get(animation['name'], 0), times[-1] - times[0])
        assert changed, animation['name'] + ' must contain real motion'
    report = {'bytes': len(data), 'triangles': triangles, 'meshes': len(gltf['meshes']),
              'skins': len(gltf['skins']), 'clips_seconds': durations,
              'target_under_20000_triangles': triangles <= 20000,
              'target_under_3MiB': len(data) <= 3 * 1024 * 1024}
    (ROOT / 'docs/glb-metrics.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf8')
    print('GLB_CHECK_PASS', json.dumps(report))


def check_blender(bpy):
    import runpy
    sys.argv = [__file__, '--no-render']
    original = bpy.data.objects.get('Cube')
    counts = []
    for _ in range(2):
        runpy.run_path(str(ROOT / 'scripts/build_loopy.py'), run_name='__main__')
        counts.append((len(bpy.data.collections['LoopyPrototype'].objects),
                       len([a for a in bpy.data.actions if a.name.startswith('LP_')]),
                       len([m for m in bpy.data.meshes if m.name.startswith('LP_')])))
        if original is not None:
            assert bpy.data.objects.get('Cube') == original, 'Unrelated object must survive'
    assert counts[0] == counts[1], counts
    assert counts[0][1] == 6, counts
    bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'blender/zanmang_loopy.blend'))
    rig = bpy.data.objects['LP_Rig']
    floor = {}
    for name in sorted(EXPECTED):
        action = bpy.data.actions['LP_' + name]
        rig.animation_data.action = action
        rig.animation_data.action_slot = action.slots[0]
        minimum = float('inf')
        for frame in range(1, int(action.frame_end) + 1):
            bpy.context.scene.frame_set(frame)
            graph = bpy.context.evaluated_depsgraph_get()
            for obj in bpy.data.collections['LoopyPrototype'].objects:
                if obj.type != 'MESH':
                    continue
                evaluated = obj.evaluated_get(graph)
                generated = evaluated.to_mesh()
                coordinates = [evaluated.matrix_world @ v.co for v in generated.vertices]
                assert all(math.isfinite(component) for p in coordinates for component in p)
                if obj.name.startswith(('LP_Foot.', 'LP_Toe.')):
                    minimum = min(minimum, *(p.z for p in coordinates))
                evaluated.to_mesh_clear()
            # Child and parent origins coincide at the elbow throughout every action.
            for side in ('L', 'R'):
                assert (rig.pose.bones['Arm.' + side].tail - rig.pose.bones['Forearm.' + side].head).length < .0001
        floor[name] = round(minimum, 6)
        assert minimum >= -.015, (name, 'foot below floor', minimum)
    report = {'idempotence_counts': counts, 'minimum_foot_z': floor, 'unrelated_object_preserved': original is not None}
    (ROOT / 'docs/blender-check.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf8')
    print('BLENDER_CHECK_PASS', json.dumps(report))


if __name__ == '__main__':
    try:
        import bpy
    except ImportError:
        check_glb()
    else:
        check_blender(bpy)
