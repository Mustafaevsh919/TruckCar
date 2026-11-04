import bpy, math, gzip
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'models/Volvo_VNL_760.blend';OUT=ROOT/'desktop/app/assets/truck.glb'
bpy.ops.wm.open_mainfile(filepath=str(SRC));s=bpy.context.scene;s.frame_set(1)
root=bpy.data.objects['VOLVO VNL 760']
# Only this derived runtime asset is optimized; the editable original stays intact.
for o in bpy.data.objects:
 if o.animation_data:o.animation_data_clear()
def parent(o,p):
 m=o.matrix_world.copy();o.parent=p;o.matrix_world=m
wheels=[]
for x in [2.35,-2.82,-4.15]:
 for side in [-1,1]:
  for y in ([side*1.03] if x>0 else [side*.84,side*1.16]):
   e=bpy.data.objects.new('Wheel Spin %02d'%len(wheels),None);s.collection.objects.link(e);e.location=(x,y,.60);e.parent=root;wheels.append(e)
bpy.context.view_layer.update()
for o in list(bpy.data.collections['02 Wheels and brakes'].objects):
 if o.name.startswith(('Brake rotor','Brake caliper')):continue
 box=[o.matrix_world@Vector(v) for v in o.bound_box];center=sum(box,Vector())/8
 wheel=min(wheels,key=lambda w:(center.x-w.location.x)**2+(center.y-w.location.y)**2)
 parent(o,wheel)
bpy.context.view_layer.update()
model=set()
def descend(o):
 model.add(o)
 for ch in o.children:descend(ch)
descend(root)
bpy.ops.object.select_all(action='DESELECT')
for o in model:
 if o.type in ['MESH','CURVE','FONT']:o.select_set(True)
bpy.context.view_layer.objects.active=next(o for o in model if o.type=='MESH')
bpy.ops.object.convert(target='MESH')
model=set();descend(root)
# Merge by animated parent and material: preserve hinges, sliding glass, wheels.
groups={}
for o in model:
 if o.type!='MESH' or o.name.startswith('Door glazing'):continue
 mats=tuple(m.name if m else '' for m in o.data.materials)
 groups.setdefault((o.parent.name,mats),[]).append(o)
for (parent_name,mats),objects in groups.items():
 if len(objects)>1:
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
 obj=objects[0];obj.name=parent_name+' | '+('-'.join(mats) or 'material')
bpy.ops.object.select_all(action='DESELECT')
model=set();descend(root)
for o in model:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT),use_selection=True,export_apply=True,export_animations=False,export_extras=True)
print('RUNTIME MODEL',len([o for o in model if o.type=='MESH']),'meshes',len(wheels),'wheel pivots',flush=True)

with open(OUT,'rb') as src: data=src.read()
with open(str(OUT)+'.gz','wb') as dst: dst.write(gzip.compress(data,compresslevel=8,mtime=0))
