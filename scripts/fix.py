import bpy
O=str(__import__('pathlib').Path(__file__).resolve().parents[1] / 'models')+'/'
bpy.ops.wm.open_mainfile(filepath=O+'Volvo_VNL_760.blend')
ob=bpy.data.objects['Panoramic windshield']
for v in ob.data.vertices:v.co.x=-1.97 if v.co.z<2.5 else -1.66
ob=bpy.data.objects['Windshield centre divider']
ob.data.splines[0].points[0].co.x=-1.985;ob.data.splines[0].points[1].co.x=-1.675
root=bpy.data.objects['VOLVO VNL 760 | approximate photo reference model']
bpy.ops.object.select_all(action='DESELECT')
for ob in root.children:ob.select_set(True)
root.select_set(True)
bpy.ops.export_scene.gltf(filepath=O+'Volvo_VNL_760.glb',use_selection=True,export_apply=True)
bpy.context.scene.cycles.samples=24
bpy.ops.wm.save_as_mainfile(filepath=O+'Volvo_VNL_760.blend')
bpy.ops.render.render(write_still=True)
