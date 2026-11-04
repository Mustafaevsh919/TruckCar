import bpy, math, os
from mathutils import Vector
from math import sin,cos,pi
O=str(__import__('pathlib').Path(__file__).resolve().parents[1] / 'models'); os.makedirs(O, exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def mat(n,c,metal=0,rough=.35):
 m=bpy.data.materials.new(n); m.diffuse_color=(*c,1); m.use_nodes=True; p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*c,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough; return m
paint=mat('Silver blue metallic',(.31,.40,.53),.7,.27); chrome=mat('Polished aluminium',(.65,.7,.75),.85,.2); rubber=mat('Tire rubber',(.018,.022,.027),0,.75); dark=mat('Chassis graphite',(.035,.045,.055),.5); glass=mat('Smoked blue glass',(.025,.07,.09),.55,.15); white=mat('LED lenses',(.78,.9,1),.3,.17); amber=mat('Amber markers',(1,.4,.025),.25); red=mat('Tail lamps',(.6,.025,.02),.2)
def finish(ob,n,m,bev=0):
 ob.name=n; ob.data.materials.append(m)
 if bev:
  mod=ob.modifiers.new('Soft manufactured edges','BEVEL'); mod.width=bev; mod.segments=3
  ob.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return ob
def box(n,loc,scale,m,bev=.04):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc); ob=bpy.context.object; ob.dimensions=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); return finish(ob,n,m,bev)
def mesh(n,v,f,m,bev=.03):
 me=bpy.data.meshes.new(n); me.from_pydata(v,[],f); me.update(); ob=bpy.data.objects.new(n,me); bpy.context.collection.objects.link(ob); return finish(ob,n,m,bev)
def profile(n,coords,w,m,bev=.05):
 v=[(x,y,z) for y in [-w/2,w/2] for x,z in coords]; l=len(coords); f=[tuple(range(l-1,-1,-1)),tuple(range(l,2*l))]+[(i,(i+1)%l,(i+1)%l+l,i+l) for i in range(l)]; return mesh(n,v,f,m,bev)
def cyl(n,loc,r,d,m,axis='Y',verts=48):
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=d,location=loc,rotation=(pi/2,0,0) if axis=='Y' else (0,0,0)); ob=finish(bpy.context.object,n,m,.012)
 for p in ob.data.polygons:p.use_smooth=True
 return ob
def line(n,pts,r,m):
 cu=bpy.data.curves.new(n,'CURVE');cu.dimensions='3D';cu.bevel_depth=r;cu.bevel_resolution=3;sp=cu.splines.new('POLY');sp.points.add(len(pts)-1)
 for p,co in zip(sp.points,pts):p.co=(*co,1)
 ob=bpy.data.objects.new(n,cu);bpy.context.collection.objects.link(ob);ob.data.materials.append(m);return ob
# vehicle: nose x=-4.1, rear x=4.0, ground z=0
for y in [-.62,.62]:box('Longitudinal frame rail',(1,y,.79),(6,.15,.26),dark)
for x in [-.8,.8,2.2,3.45]:box('Frame crossmember',(x,0,.79),(.16,1.4,.16),dark)
profile('High roof sleeper cab',[(-1.85,1.05),(-1.85,2.38),(-1.48,3.16),(-1.2,3.42),(-.65,3.77),(.3,4.01),(1.23,4.02),(1.39,3.87),(1.39,1.05)],2.4,paint,.13)
# aerodynamic roof visor
profile('Windshield sun visor',[(-1.68,3.01),(-1.78,3.17),(-1.25,3.46),(-.95,3.4),(-1.4,3.12)],2.54,paint,.06)
# hood loft cross sections
sections=[(-4.12,.85,1.55),(-3.9,.99,1.8),(-3.05,1.03,2.04),(-1.82,1.06,2.25)]
v=[]
for x,w,z in sections:v +=[(x,-w,.86),(x,w,.86),(x,w,z-.19),(x,w*.72,z),(x,-w*.72,z),(x,-w,z-.19)]
f=[tuple(range(5,-1,-1)),tuple(range(18,24))]
for j in range(3):
 for i in range(6):f.append((j*6+i,j*6+(i+1)%6,(j+1)*6+(i+1)%6,(j+1)*6+i))
mesh('Sculpted sloping hood',v,f,paint,.12)
# windshield sloped plane
mesh('Panoramic windshield',[(-1.89,-1.04,2.25),(-1.89,1.04,2.25),(-1.48,1.04,3.04),(-1.48,-1.04,3.04)],[(0,1,2,3)],glass,.025)
line('Windshield centre divider',[(-1.9,0,2.25),(-1.49,0,3.04)],.018,dark)
for s in [-1,1]:
 y=s*1.213
 mesh('Driver side glazing' if s<0 else 'Passenger glazing',[(-1.72,y,2.15),(-.7,y,2.15),(-.7,y,3.02),(-1.34,y,3.02)],[(0,1,2,3)],glass,.045)
 # door seam
 line('Door perimeter',[(-1.73,y*1.005,2.12),(-1.73,y*1.005,1.28),(-.59,y*1.005,1.28),(-.59,y*1.005,3.08)],.009,dark)
 box('Door handle',(-.77,s*1.235,1.57),(.18,.04,.065),chrome,.015)
 for z,x in [(2.55,.61),(3.38,.55)]:box('Sleeper window',(x,s*1.216,z),(.64,.035,.34),glass,.085)
 line('Cab panel seam',[(-.45,y,3.02),(1.26,y,3.02)],.009,dark)
 box('Mirror housing',(-1.66,s*1.49,2.58),(.22,.17,.66),chrome,.065)
 box('Mirror glass',(-1.55,s*1.5,2.58),(.025,.14,.53),glass,.025)
 line('Mirror support',[(-1.38,y,2.95),(-1.63,s*1.48,2.91)],.025,dark)
 # side skirts and steps
 box('Aerodynamic side skirt',(-.05,s*1.07,.68),(3.1,.35,.6),paint,.13)
 for z,x,l in [(.67,-1.1,.8),(1.0,-1.13,.72)]:
  box('Access step',(x,s*1.22,z),(l,.35,.1),chrome,.025)
  for j in range(7):box('Step grip',(x-l*.4+j*l*.13,s*1.23,z+.055),(.025,.29,.007),dark,.002)
 for x in [-.4,.15,.7,1.2]:box('Side marker',(x,s*1.258,.7),(.11,.023,.035),amber,.01)
 box('Rear mudflap',(3.92,s*.98,.47),(.08,.48,.76),rubber,.02)
# fenders curved arch bands around front wheel
for s in [-1,1]:
 vs=[];steps=40
 for i in range(steps+1):
  a=pi*i/steps
  for y,r in [(s*.88,.69),(s*1.27,.69),(s*.88,.82),(s*1.27,.82)]:vs.append((-2.92+cos(a)*r,y,.62+sin(a)*r))
 fs=[]
 for i in range(steps):
  for a,b in [(0,1),(1,3),(3,2),(2,0)]:fs.append((4*i+a,4*i+b,4*(i+1)+b,4*(i+1)+a))
 mesh('Front wheel arch',vs,fs,paint,.025)
# wheels, dual rear tires
for x in [-2.92,2.15,3.4]:
 cyl('Axle',(x,0,.61),.11,2.22,dark)
 for s in [-1,1]:
  ys=[s*1.02] if x<0 else [s*.83,s*1.15]
  for y in ys:
   cyl('Heavy duty tire',(x,y,.61),.59,.29,rubber)
   for offset in [-.1,0,.1]:
    bpy.ops.mesh.primitive_torus_add(major_segments=48,minor_segments=8,location=(x,y+offset,.61),major_radius=.582,minor_radius=.009,rotation=(pi/2,0,0));finish(bpy.context.object,'Circumferential tread',dark)
  outer=s*(1.18 if x<0 else 1.31)
  cyl('Alloy wheel rim',(x,outer,.61),.385,.045,chrome)
  cyl('Wheel dish',(x,outer+s*.027,.61),.285,.03,dark)
  cyl('Hub cover',(x,outer+s*.055,.61),.19,.09,chrome)
  for i in range(10):
   a=i*2*pi/10; cyl('Lug nut',(x+.235*cos(a),outer+s*.06,.61+.235*sin(a)),.026,.045,chrome,verts=6)
# front grille at nose
box('Front bumper',(-4.13,0,.59),(.24,2.32,.38),paint,.1)
box('Grille chrome surround',(-4.175,0,1.29),(.09,1.49,1.12),chrome,.11)
box('Grille black core',(-4.23,0,1.3),(.035,1.34,.98),dark,.08)
for z in [ .88+i*.075 for i in range(12)]:line('Grille horizontal fin',[(-4.255,-.61,z),(-4.27,0,z-.02),(-4.255,.61,z)],.012,chrome)
for y in [-.52+i*.13 for i in range(9)]:line('Grille mesh vertical',[(-4.26,y,.87),(-4.26,y,1.73)],.005,chrome)
line('Volvo diagonal slash',[(-4.29,-.59,.86),(-4.29,.59,1.76)],.025,chrome)
cyl('Volvo emblem',(-4.31,0,1.31),.105,.025,chrome,axis='Z').rotation_euler=(0,pi/2,0)
for s in [-1,1]:
 box('Headlamp housing',(-4.0,s*.98,1.1),(.15,.33,.36),dark,.06)
 for z in [1.02,1.15]:box('LED headlamp',(-4.09,s*.98,z),(.035,.26,.065),white,.025)
 box('Bumper fog lamp',(-4.27,s*.96,.57),(.03,.24,.11),white,.025)
 box('Hood air intake',(-2.7,s*1.045,1.9),(.66,.025,.13),dark,.04)
 for x in [-3.5]:
  line('Hood mirror stalk',[(x,s*.87,2.0),(x-.05,s*1.34,2.23)],.024,chrome)
  box('Hood mirror',(x-.05,s*1.34,2.26),(.19,.15,.12),chrome,.04)
 for z in [2.28]:line('Wiper',[(-1.91,s*.86,z),(-1.93,s*.22,z+.07)],.018,dark)
# roof lights
for y in [-.9,-.45,0,.45,.9]:box('Roof clearance light',(-1.5,y,3.24),(.11,.1,.045),amber,.02)
box('Rear cab rubber seal',(1.4,0,2.54),(.12,2.3,2.8),dark,.04)
box('Fifth wheel pedestal',(2.55,0,1.0),(.9,.7,.23),dark)
cyl('Fifth wheel coupling',(2.6,0,1.15),.59,.1,dark,axis='Z')
box('Coupling slot',(2.98,0,1.21),(.45,.1,.02),rubber,.01)
for x in [1.5,1.72,1.94]:box('Catwalk deck',(x,0,.98),(.18,1.35,.05),chrome,.01)
for s in [-1,1]:
 box('Rear tail lamp',(3.99,s*.8,.73),(.04,.27,.1),red,.02)
# presentation
bpy.ops.object.empty_add();root=bpy.context.object;root.name='VOLVO VNL 760 | approximate photo reference model'
for ob in list(bpy.context.scene.objects):
 if ob!=root:ob.parent=root
bpy.ops.object.select_all(action='DESELECT')
for ob in root.children:ob.select_set(True)
root.select_set(True)
bpy.ops.export_scene.gltf(filepath=O+'/Volvo_VNL_760.glb',use_selection=True,export_apply=True)
# ground studio
floor=mat('Studio floor',(.12,.145,.18),0,.65);box('Studio ground',(0,0,-.08),(200,200,.1),floor,0)
world=bpy.context.scene.world;world.color=(.25,.25,.25)
def area(n,loc,power,size):
 bpy.ops.object.light_add(type='AREA',location=loc);ob=bpy.context.object;ob.name=n;ob.data.energy=power;ob.data.shape='DISK';ob.data.size=size;ob.rotation_euler=(Vector((0,0,1.5))-ob.location).to_track_quat('-Z','Y').to_euler()
area('Key softbox',(-5,-6,9),2300,7);area('Roof softbox',(2,1,10),2800,6);area('Rim light',(4,5,5),2200,5)
bpy.ops.object.camera_add(location=(-10.8,-11,6.3));cam=bpy.context.object;cam.rotation_euler=(Vector((-.05,0,1.8))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=11.4;bpy.context.scene.camera=cam
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=32;sc.cycles.use_denoising=False;sc.render.resolution_x=1500;sc.render.resolution_y=1050;sc.render.resolution_percentage=100
sc.world.use_nodes=True;sc.world.node_tree.nodes['Background'].inputs[0].default_value=(.23,.28,.36,1);sc.world.node_tree.nodes['Background'].inputs[1].default_value=.4
sc.render.image_settings.file_format='PNG';sc.render.filepath=O+'/Volvo_VNL_760_preview.png'
sc.view_settings.view_transform='AgX'
bpy.ops.wm.save_as_mainfile(filepath=O+'/Volvo_VNL_760.blend');bpy.ops.render.render(write_still=True)
print('DONE',len(root.children))
