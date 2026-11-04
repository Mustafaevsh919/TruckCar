"""Render actual interior, sleeper and engine inspection views from the saved scene."""
import bpy, os, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
MODEL=Path(os.environ.get('VOLVO_MODEL',str(ROOT/'models/Volvo_VNL_760.blend')))
OUT=Path(os.environ.get('VOLVO_PREVIEWS',str(ROOT/'previews')));OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(MODEL));s=bpy.context.scene
s.cycles.samples=int(os.environ.get('VOLVO_SAMPLES','48'));s.cycles.use_denoising=False
s.render.resolution_x=int(os.environ.get('VOLVO_WIDTH','1280'));s.render.resolution_y=int(s.render.resolution_x*2/3);s.render.resolution_percentage=100

def light(n,loc,target,power,size):
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=n;o.data.energy=power;o.data.size=size;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();return o
light('Cabin inspection fill',(-.30,0,2.86),(.65,0,1.5),65,1.2)
light('Sleeper inspection fill',(-1.18,0,3.55),(-1.3,0,1.8),70,1.0)
for name,cam,frame in [('interior','Interior camera',1),('sleeper','Sleeper camera',1),('engine','Engine camera',80)]:
 if name not in os.environ.get('VOLVO_VIEWS','interior,sleeper,engine').split(','):continue
 hidden=[]
 s.frame_set(frame);s.camera=bpy.data.objects[cam]
 if name=='sleeper':
  # Actual geometry shown as a cutaway: remove the near shell and cabinet.
  s.camera.location=(-1.0,-4.7,3.35);s.camera.rotation_euler=(Vector((-1.15,0,2.35))-s.camera.location).to_track_quat('-Z','Y').to_euler();s.camera.data.lens=45
  for o in bpy.data.objects:
   if o.name.startswith(('Aerodynamic high roof','Windshield sun visor')) or (o.name.startswith(('Sleeper side shell','Lower interior lining','Sleeper window seal','Sleeper glass','Roof shoulder panel','Sleeper cabinet','Cabinet door','Cabinet handle')) and o.location.y<0):
    hidden.append((o,o.hide_render));o.hide_render=True
  def hide_branch(o):
   hidden.append((o,o.hide_render));o.hide_render=True
   for ch in o.children:hide_branch(ch)
  hide_branch(bpy.data.objects['Door hinge L'])
 if name=='engine':
  bpy.data.objects['Hood hinge'].rotation_euler.y=math.radians(75)
  s.camera.location=(3.1,-4.2,2.8);s.camera.rotation_euler=(Vector((1.95,0,1.35))-s.camera.location).to_track_quat('-Z','Y').to_euler();s.camera.data.lens=52
  light('Engine inspection fill',(2,-2.5,3.4),(1.9,0,1.2),180,2)
 s.render.filepath=str(OUT/f'Volvo_VNL_760_{name}.png')
 print('VIEW',name,flush=True);bpy.ops.render.render(write_still=True)
 for o,old in hidden:o.hide_render=old
print('ALL VIEWS COMPLETE',flush=True)
