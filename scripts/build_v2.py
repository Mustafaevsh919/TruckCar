"""Blender 4.x: procedural Volvo VNL 760; approximate photo-reference geometry.
Run: blender -b -t 8 --python scripts/build_v2.py
OPEN_HOOD / OPEN_DOORS are degrees. No factory CAD accuracy is implied.
"""
import bpy, math, os
from pathlib import Path
from mathutils import Vector
PI=math.pi; TAU=math.tau
OPEN_HOOD=0; OPEN_DOORS=0; HIDE_ROOF=False
OUT=Path(os.environ.get('VOLVO_OUTPUT',str(Path(__file__).resolve().parents[1]/'models')));OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
 if c.name!='Collection':bpy.data.collections.remove(c)
S=bpy.context.scene;S.unit_settings.system='METRIC'
C={};ACTIVE=None

def collection(n):
 global ACTIVE
 if n not in C:C[n]=bpy.data.collections.new(n);S.collection.children.link(C[n])
 ACTIVE=C[n];print('BUILD SECTION',n,flush=True);return ACTIVE

def mat(n,c,metal=0,rough=.4,trans=0,emit=0):
 m=bpy.data.materials.new(n);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;p.inputs['Transmission Weight'].default_value=trans;p.inputs['IOR'].default_value=1.46;p.inputs['Coat Weight'].default_value=.35 if metal else .08
 if emit:p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=emit
 m.diffuse_color=(*c,1);return m
PAINT=mat('Silver blue metallic',(.29,.38,.49),.72,.23);CHROME=mat('Chrome',(.66,.70,.74),.96,.17);ALU=mat('Aluminium',(.43,.47,.51),.82,.34);STEEL=mat('Chassis steel',(.045,.052,.058),.7,.4);BLACK=mat('Black plastic',(.016,.019,.024),.05,.5);RUBBER=mat('Rubber',(.012,.015,.018),0,.79);GLASS=mat('Clear automotive glass',(.65,.78,.83),0,.035,.98);MIRROR=mat('Mirror',(.88,.91,.94),1,.035);LENS=mat('Lamp lens',(.78,.86,.92),.05,.16,.55);LED=mat('LED',(.80,.91,1),0,.2,emit=1.5);AMBER=mat('Amber',(1,.32,.015),.1,.25);RED=mat('Red',(.64,.012,.016),.1,.2);DASH=mat('Dashboard',(.055,.06,.066),0,.6);FABRIC=mat('Seat fabric',(.105,.12,.14),0,.93);LEATHER=mat('Vinyl',(.045,.05,.058),0,.62);TRIM=mat('Interior trim',(.41,.39,.35),0,.83);BED=mat('Mattress',(.48,.51,.54),0,.96);WOOD=mat('Cabinet wood',(.18,.12,.075),0,.48);ENGINE=mat('Volvo engine green',(.065,.21,.15),.5,.38);SCREEN=mat('Display',(.012,.055,.08),.1,.25,emit=.4)

def finish(o,n,m=None,b=0,smooth=False):
 o.name=n
 for c in list(o.users_collection):c.objects.unlink(o)
 ACTIVE.objects.link(o)
 if m:o.data.materials.append(m)
 if b and o.type=='MESH':
  mod=o.modifiers.new('Edge radii','BEVEL');mod.width=b;mod.segments=3;mod.limit_method='ANGLE';mod=o.modifiers.new('Normals','WEIGHTED_NORMAL');mod.keep_sharp=True
 if smooth and o.type=='MESH':
  for p in o.data.polygons:p.use_smooth=True
 return o

def box(n,loc,size,m,b=.02,rot=None):
 sx,sy,sz=[v/2 for v in size];v=[(-sx,-sy,-sz),(sx,-sy,-sz),(sx,sy,-sz),(-sx,sy,-sz),(-sx,-sy,sz),(sx,-sy,sz),(sx,sy,sz),(-sx,sy,sz)];f=[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)];me=bpy.data.meshes.new(n);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(n,me);ACTIVE.objects.link(o);o.location=loc
 if rot:o.rotation_euler=rot
 return finish(o,n,m,b)

def mesh(n,v,f,m,b=0,smooth=False):
 me=bpy.data.meshes.new(n);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(n,me);ACTIVE.objects.link(o)
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False)
 return finish(o,n,m,b,smooth)

def profile(n,coords,w,m,y=0,b=.02):
 l=len(coords);v=[(x,y+s*w/2,z) for s in [-1,1] for x,z in coords];f=[tuple(reversed(range(l))),tuple(range(l,l*2))]+[(i,(i+1)%l,(i+1)%l+l,i+l) for i in range(l)];return mesh(n,v,f,m,b)

def cyl(n,loc,r,d,m,axis='Z',verts=48):
 v=[(r*math.cos(i*TAU/verts),r*math.sin(i*TAU/verts),z) for z in [-d/2,d/2] for i in range(verts)];f=[tuple(reversed(range(verts))),tuple(range(verts,2*verts))]+[(i,(i+1)%verts,(i+1)%verts+verts,i+verts) for i in range(verts)];me=bpy.data.meshes.new(n);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(n,me);ACTIVE.objects.link(o);o.location=loc
 if axis=='X':o.rotation_euler.y=PI/2
 elif axis=='Y':o.rotation_euler.x=PI/2
 return finish(o,n,m,min(.008,r*.12),True)

def sphere(n,loc,scale,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=loc);o=bpy.context.object;o.scale=scale;return finish(o,n,m,0,True)

def tube(n,pts,r,m,cyclic=False):
 cu=bpy.data.curves.new(n,'CURVE');cu.dimensions='3D';cu.resolution_u=12;cu.bevel_depth=r;cu.bevel_resolution=3;sp=cu.splines.new('POLY');sp.points.add(len(pts)-1)
 for p,co in zip(sp.points,pts):p.co=(*co,1)
 sp.use_cyclic_u=cyclic;o=bpy.data.objects.new(n,cu);ACTIVE.objects.link(o);o.data.materials.append(m);return o

def rod(n,a,b,r,m):
 a,b=Vector(a),Vector(b);o=cyl(n,(a+b)/2,r,(b-a).length,m);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o

def torus(n,loc,major,minor,m,axis='Z'):
 v=[];f=[];na=64;nb=10
 for i in range(na):
  a=i*TAU/na
  for j in range(nb):
   b=j*TAU/nb;r=major+minor*math.cos(b);v.append((r*math.cos(a),r*math.sin(a),minor*math.sin(b)))
 for i in range(na):
  for j in range(nb):f.append((i*nb+j,((i+1)%na)*nb+j,((i+1)%na)*nb+(j+1)%nb,i*nb+(j+1)%nb))
 me=bpy.data.meshes.new(n);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(n,me);ACTIVE.objects.link(o);o.location=loc
 if axis=='X':o.rotation_euler.y=PI/2
 elif axis=='Y':o.rotation_euler.x=PI/2
 return finish(o,n,m,0,True)

def empty(n,loc):
 bpy.ops.object.empty_add(type='PLAIN_AXES',location=loc);return finish(bpy.context.object,n)

def parent(o,p):
 matrix=o.matrix_world.copy();o.parent=p;o.matrix_world=matrix

def parent_new(before,p):
 bpy.context.view_layer.update()
 for o in set(bpy.data.objects)-before:
  if o!=p and o.parent is None:parent(o,p)

def cut(o,c):
 bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Opening','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=c;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(c,do_unlink=True)

def label(n,text,loc,size,m,rot=(0,0,0)):
 cu=bpy.data.curves.new(n,'FONT');cu.body=text;cu.align_x='CENTER';cu.align_y='CENTER';cu.size=size;cu.extrude=.0006;o=bpy.data.objects.new(n,cu);ACTIVE.objects.link(o);o.location=loc;o.rotation_euler=rot;cu.materials.append(m);return o

def loft(n,sections,m,b=.03):
 v=[]
 for x,w,bot,top in sections:v.extend([(x,-w*.83,bot),(x,w*.83,bot),(x,w,bot+.12),(x,w,top-.12),(x,w*.77,top),(x,-w*.77,top),(x,-w,top-.12),(x,-w,bot+.12)])
 f=[tuple(reversed(range(8)))];end=(len(sections)-1)*8;f.append(tuple(range(end,end+8)))
 for j in range(len(sections)-1):
  for k in range(8):f.append((j*8+k,j*8+(k+1)%8,(j+1)*8+(k+1)%8,(j+1)*8+k))
 return mesh(n,v,f,m,b)

def ring_x(n,x,out,inside,m,d=.035):
 l=len(out);v=[]
 for xx in [x-d/2,x+d/2]:v.extend([(xx,y,z) for y,z in out]+[(xx,y,z) for y,z in inside])
 f=[]
 for i in range(l):
  j=(i+1)%l;f.extend([(i,j,l+j,l+i),(2*l+i,3*l+i,3*l+j,2*l+j),(i,2*l+i,2*l+j,j),(l+i,l+j,3*l+j,3*l+i)])
 return mesh(n,v,f,m,.012)

collection('01 Chassis and suspension')
for side in [-1,1]:
 y=side*.47;box('Frame rail',(-.9,y,.89),(7.5,.11,.30),STEEL,.012)
 for x in [-4.15,-2.82,2.35]:
  box('Suspension bracket',(x,y,.73),(.25,.17,.31),STEEL);rod('Shock absorber',(x-.22,y,.62),(x+.12,y,1.03),.045,BLACK);rod('Damper piston',(x+.02,y,.89),(x+.16,y,1.10),.018,CHROME)
 for x in [-4.15,-2.82]:
  cyl('Air spring',(x+.27,y,.91),.13,.23,RUBBER)
  for z in [.82,.87,.92,.97]:torus('Air spring fold',(x+.27,y,z),.125,.012,RUBBER)
 for layer in range(5):
  tube('Leaf spring',[(2.35+t*(.65-layer*.05),y,.65+.09*t*t+layer*.012) for t in [-1+i/8 for i in range(17)]],.017,STEEL)
 cyl('Fuel tank',(-1.35,side*.89,.88),.29,1.25,ALU,'X')
 for x in [-1.78,-.92]:torus('Fuel tank strap',(x,side*.89,.88),.296,.018,STEEL,'X')
 cyl('Fuel filler',(-1.15,side*.91,1.17),.065,.045,CHROME)
 tube('Brake line',[(-4.3,side*.36,1.02),(-2,side*.36,1.02),(.5,side*.36,1.02),(2.35,side*.36,.7)],.009,BLACK)
for x in [-4.55,-3.5,-2.2,-1,.4,1.6,2.8]:box('Frame crossmember',(x,0,.88),(.13,.99,.18),STEEL)
for x in [-4.15,-2.82,2.35]:
 cyl('Axle',(x,0,.61),.085,2.02,STEEL,'Y')
 if x<0:sphere('Differential',(x,0,.64),(.23,.22,.20),STEEL)
rod('Driveshaft',(-3.95,0,.69),(.35,0,.91),.065,STEEL)
for x in [-3.95,-2.85,.35]:sphere('Universal joint',(x,0,.73),(.10,.10,.10),ALU)
for x in [-2,-1.55]:cyl('Air reservoir',(x,0,.63),.13,.55,STEEL,'Y')

collection('02 Wheels and brakes')
def tire(x,y,w=.30):
 cross=[(-w/2,.40),(-w/2,.50),(-w*.42,.57),(-w*.28,.595),(w*.28,.595),(w*.42,.57),(w/2,.50),(w/2,.40)];v=[];f=[];n=len(cross)
 for i in range(96):
  a=i*TAU/96;v.extend([(x+r*math.cos(a),y+yy,.60+r*math.sin(a)) for yy,r in cross])
 for i in range(96):
  for j in range(n):f.append((i*n+j,((i+1)%96)*n+j,((i+1)%96)*n+(j+1)%n,i*n+(j+1)%n))
 mesh('295 75 R22.5 tire',v,f,RUBBER,smooth=True)
 for off in [-.092,-.032,.032,.092]:torus('Tread longitudinal groove',(x,y+off,.60),.594,.005,BLACK,'Y')
 for i in range(64):
  a=i*TAU/64;pts=[]
  for j in range(5):
   yy=-w*.35+j*w*.175;aa=a+(.018 if j%2 else -.018);pts.append((x+.596*math.cos(aa),y+yy,.60+.596*math.sin(aa)))
  tube('Tread transverse groove',pts,.003,BLACK)
for x in [2.35,-2.82,-4.15]:
 for side in [-1,1]:
  for y in ([side*1.03] if x>0 else [side*.84,side*1.16]):tire(x,y)
  out=side*(1.187 if x>0 else 1.317);cyl('Brake rotor',(x,side*.91,.60),.32,.045,STEEL,'Y');box('Brake caliper',(x+.22,side*.91,.71),(.18,.12,.21),STEEL)
  cyl('Wheel rim',(x,out,.60),.405,.052,CHROME,'Y');cyl('Wheel dish',(x,out+side*.03,.60),.335,.015,ALU,'Y');torus('Polished rim lip',(x,out+side*.045,.60),.38,.018,CHROME,'Y')
  for i in range(10):
   a=i*TAU/10;cyl('Rim vent',(x+.285*math.cos(a),out+side*.043,.60+.285*math.sin(a)),.041,.008,BLACK,'Y',24);cyl('Wheel lug',(x+.205*math.cos(a),out+side*.07,.60+.205*math.sin(a)),.024,.042,CHROME,'Y',6)
  cyl('Wheel hub',(x,out+side*.075,.60),.145,.12,CHROME,'Y');cyl('Hub cap',(x,out+side*.145,.60),.082,.02,ALU,'Y')

collection('03 Engine and transmission')
box('Inline six engine block',(1.90,0,1.28),(1.35,.64,.67),ENGINE,.045);box('Cylinder head',(1.90,0,1.66),(1.38,.68,.15),ENGINE);box('Valve cover',(1.90,0,1.81),(1.34,.54,.18),BLACK,.06);box('Oil sump',(1.87,0,.87),(.96,.51,.25),STEEL,.07)
for x in [1.35,1.58,1.81,2.04,2.27,2.50]:
 for side in [-1,1]:
  cyl('Head bolt',(x,side*.28,1.76),.019,.03,CHROME,verts=6);cyl('Engine fastener',(x,side*.328,1.26),.021,.025,ALU,'Y',6)
 tube('Fuel injection line',[(x,-.36,1.30),(x,-.39,1.61),(x,-.21,1.75)],.009,STEEL)
 tube('Exhaust runner',[(x,.33,1.60),(x,.48,1.51),(x+.05,.49,1.34)],.043,STEEL)
tube('Exhaust manifold',[(1.35,.49,1.34),(2.52,.49,1.34)],.065,STEEL);torus('Turbo compressor',(1.43,.54,1.37),.115,.054,ALU,'Y');cyl('Turbo center housing',(1.43,.54,1.37),.072,.24,STEEL,'Y')
tube('Charge air pipe',[(1.43,.68,1.37),(1.67,.74,1.65),(2.8,.68,1.65),(2.94,.42,1.52)],.073,ALU);tube('Intake pipe',[(1.35,-.44,1.59),(2.65,-.44,1.59),(2.82,-.67,1.47),(2.97,-.44,1.40)],.067,BLACK)
for x in [1.6,2.3,2.7]:torus('Intake clamp',(x,.74 if x<2.7 else .68,1.65),.076,.007,CHROME,'X')
box('Radiator',(3,0,1.31),(.15,1.08,.98),BLACK)
for i in range(54):box('Radiator fin',(3.087,-.5+i*.019,1.31),(.012,.006,.88),ALU,0)
for side in [-1,1]:
 box('Radiator tank',(3,side*.55,1.31),(.18,.09,1.02),BLACK);tube('Coolant hose',[(3,side*.43,1.78),(2.76,side*.48,1.90),(2.4,side*.31,1.72)],.047,RUBBER)
cyl('Fan hub',(2.83,0,1.31),.09,.13,BLACK,'X')
for i in range(9):
 a=i*TAU/9;o=box('Cooling fan blade',(2.82,.24*math.cos(a),1.31+.24*math.sin(a)),(.035,.14,.35),BLACK,.025);o.rotation_euler.x=a;o.rotation_euler.z=.2
for y,z,r in [(0,1.05,.15),(-.29,1.4,.09),(.28,1.48,.09)]:cyl('Accessory pulley',(2.64,y,z),r,.045,STEEL,'X')
tube('Serpentine belt',[(2.675,0,.9),(2.675,-.38,1.4),(2.675,-.29,1.5),(2.675,.28,1.58),(2.675,.37,1.48),(2.675,.15,1.05)],.014,RUBBER,True)
cyl('Oil filter',(1.5,-.44,1.1),.08,.24,BLACK);cyl('Fuel filter',(1.17,-.43,1.22),.07,.23,ALU);cyl('Alternator',(2.44,-.30,1.39),.13,.23,ALU,'X');box('Engine ECU',(1.7,-.36,1.43),(.44,.07,.29),ALU)
for i in range(5):tube('Engine wiring',[(1.18,-.4,1.5+i*.016),(1.75,-.42,1.52+i*.016),(2.4,-.36,1.65+i*.016)],.006,BLACK)
cyl('Clutch housing',(1.05,0,1.14),.36,.33,ALU,'X');box('Transmission',(.47,0,1.01),(.91,.49,.47),ALU,.07)
for x in [.1,.25,.4,.55,.7]:box('Transmission rib',(x,0,1.01),(.025,.54,.49),ALU,.008)
tube('Exhaust',[(1.39,.65,1.31),(.65,.69,.79),(-1.4,.65,.75),(-2.04,.65,.68)],.057,STEEL);cyl('Aftertreatment housing',(-.8,.65,.76),.20,.95,ALU,'X')

collection('04 Cabin shell and glazing')
box('Cab floor',(-.39,0,1.18),(3.13,2.28,.13),STEEL);box('Floor covering',(-.39,0,1.255),(3.02,2.17,.035),BLACK);box('Cab rear wall',(-1.97,0,2.48),(.10,2.32,2.55),PAINT,.045);box('Rear wall lining',(-1.9,0,2.48),(.035,2.16,2.36),TRIM)
for side in [-1,1]:
 wall=box('Sleeper side shell',(-1.13,side*1.16,2.45),(1.65,.09,2.48),PAINT,0)
 for x,z,sx,sz in [(-1.25,2.60,.57,.38),(-1.30,3.37,.49,.27)]:
  cutter=box('Window opening',(x,side*1.16,z),(sx,.32,sz),BLACK,0);mod=cutter.modifiers.new('Window corner radii','BEVEL');mod.width=.07;mod.segments=6;bpy.context.view_layer.objects.active=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);cut(wall,cutter)
  # A hollow rubber frame, so the glass is transparent into the interior.
  frame=box('Sleeper window seal',(x,side*1.16,z),(sx+.025,.045,sz+.025),RUBBER,0)
  cut(frame,box('Seal opening',(x,side*1.16,z),(sx-.025,.14,sz-.025),BLACK,0))
  box('Sleeper glass',(x,side*1.189,z),(sx-.028,.009,sz-.028),GLASS,.035)
 mod=wall.modifiers.new('Panel edges','BEVEL');mod.width=.035;mod.segments=4;wall.modifiers.new('Normals','WEIGHTED_NORMAL')
 box('Lower interior lining',(-1.12,side*1.10,1.73),(1.60,.035,.87),TRIM)
 tube('Cab body seam',[(-1.9,side*1.21,3.03),(-.34,side*1.21,3.03)],.005,BLACK)
 rod('A pillar',(1.09,side*1.10,2.12),(.55,side*1.10,3.11),.065,PAINT);box('B pillar',(-.29,side*1.13,2.22),(.105,.13,2.04),PAINT)
roof=profile('Aerodynamic high roof',[(-2.02,3.67),(-2.02,3.91),(-1.70,4.05),(-.93,4.06),(-.25,3.88),(.34,3.54),(.69,3.20),(.55,3.10),(.14,3.42),(-.4,3.72),(-1.14,3.88),(-1.80,3.87)],2.30,PAINT,b=.065);roof.hide_render=HIDE_ROOF;roof.hide_viewport=HIDE_ROOF
visor=profile('Windshield sun visor',[(.56,3.08),(.77,3.08),(.82,3.20),(.4,3.42),(.28,3.33)],2.38,PAINT,b=.035)
wind=[(1.105,-1.055,2.16),(1.105,1.055,2.16),(.585,1.055,3.085),(.585,-1.055,3.085)];tube('Windshield seal',wind,.032,RUBBER,True)
for side in [-1,1]:
 o=mesh('Windshield',[(1.108,side*.014,2.17),(1.108,side*1.035,2.17),(.586,side*1.035,3.07),(.586,side*.014,3.07)],[(0,1,2,3)],GLASS);mod=o.modifiers.new('Glass thickness','SOLIDIFY');mod.thickness=.006
 tube('Wiper arm',[(1.145,side*.75,2.13),(1.11,side*.43,2.27)],.013,BLACK);tube('Wiper blade',[(1.10,side*.13,2.28),(1.10,side*.72,2.28)],.016,BLACK)
tube('Windshield center seam',[(1.11,0,2.16),(.585,0,3.08)],.009,RUBBER)
for y in [-.94,-.47,0,.47,.94]:box('Roof clearance lamp',(.76,y,3.19),(.055,.095,.033),AMBER,.014)
label('Globetrotter','GLOBETROTTER',(.822,0,3.245),.085,CHROME,(PI/2,0,PI/2))
# Dashboard-to-hood cowl closes the cab below the windshield.
profile('Front cowl',[(.98,1.31),(1.13,1.31),(1.14,2.16),(.97,2.16)],2.14,PAINT,b=.025)

collection('05 Doors and mirrors')
DOORS=[]
for side in [-1,1]:
 pivot=empty('Door hinge L' if side<0 else 'Door hinge R',(1,side*1.15,1.9));DOORS.append((pivot,side));before=set(bpy.data.objects)
 outline=[(-.25,1.32),(.91,1.32),(1.04,2.12),(.52,3.04),(-.25,3.04)];door=profile('Door shell',outline,.085,PAINT,side*1.15,0)
 window=[(-.14,2.12),(.89,2.12),(.46,2.94),(-.14,2.94)];cut(door,profile('Door window opening',window,.30,BLACK,side*1.15,0));mod=door.modifiers.new('Door edge radii','BEVEL');mod.width=.025;mod.segments=3;door.modifiers.new('Normals','WEIGHTED_NORMAL')
 tube('Door glass seal',[(x,side*1.198,z) for x,z in window],.025,RUBBER,True);o=mesh('Door glazing',[(x,side*1.19,z) for x,z in window],[(0,1,2,3)],GLASS);mod=o.modifiers.new('Glass thickness','SOLIDIFY');mod.thickness=.006
 tube('Door perimeter gap',[(x,side*1.20,z) for x,z in outline],.006,BLACK,True)
 box('External door handle',(-.08,side*1.218,1.69),(.19,.035,.055),BLACK,.018);box('Handle insert',(-.06,side*1.24,1.695),(.11,.012,.025),CHROME,.008);cyl('Door lock',(-.18,side*1.24,1.69),.015,.012,CHROME,'Y')
 box('Door trim',(.32,side*1.092,1.73),(1.02,.055,.72),LEATHER,.045);box('Door armrest',(.19,side*1.02,1.87),(.60,.17,.10),DASH,.035);box('Door pocket',(.23,side*1.04,1.48),(.70,.12,.17),BLACK,.035);cyl('Door speaker',(.62,side*1.047,1.57),.105,.012,BLACK,'Y')
 for j in range(7):tube('Speaker grille',[(.55,side*1.035,1.51+j*.019),(.69,side*1.035,1.51+j*.019)],.003,ALU)
 for z in [2.30,2.94]:tube('Mirror support',[(.75,side*1.18,z),(.94,side*1.40,z),(.79,side*1.51,z)],.024,STEEL)
 box('Main mirror housing',(.76,side*1.52,2.62),(.24,.17,.76),BLACK,.075);box('Painted mirror cap',(.805,side*1.53,2.64),(.18,.18,.68),PAINT,.065);box('Main mirror glass',(.628,side*1.52,2.74),(.008,.13,.43),MIRROR,.025);box('Wide angle mirror',(.628,side*1.52,2.40),(.008,.13,.19),MIRROR,.025)
 parent_new(before,pivot);pivot.rotation_euler.z=-side*math.radians(OPEN_DOORS)

collection('06 Hood fenders grille and headlamps')
HOOD=empty('Hood hinge',(3.45,0,.92));before=set(bpy.data.objects)
sections=[(1.04,.91,2.15),(1.45,.94,2.10),(2.30,.98,1.94),(3.02,.93,1.76),(3.48,.77,1.67)]
v=[];f=[];nx=40;ny=24
for i in range(nx+1):
 x=sections[0][0]+(sections[-1][0]-sections[0][0])*i/nx
 j=next((k for k in range(len(sections)-1) if sections[k][0]<=x<=sections[k+1][0]),len(sections)-2)
 a,b=sections[j],sections[j+1];t=(x-a[0])/(b[0]-a[0])
 def interp(k):
  def slope(ii):
   left=max(0,ii-1);right=min(len(sections)-1,ii+1);return (sections[right][k]-sections[left][k])/(sections[right][0]-sections[left][0])
  h=b[0]-a[0];return (2*t**3-3*t*t+1)*a[k]+(t**3-2*t*t+t)*h*slope(j)+(-2*t**3+3*t*t)*b[k]+(t**3-t*t)*h*slope(j+1)
 w=interp(1);top=interp(2)
 for k in range(ny+1):
  yy=-1+2*k/ny;v.append((x,yy*w,top-.34*abs(yy)**4))
for i in range(nx):
 for k in range(ny):f.append((i*(ny+1)+k,(i+1)*(ny+1)+k,(i+1)*(ny+1)+k+1,i*(ny+1)+k+1))
hood=mesh('Hood composite shell',v,f,PAINT,0,True);mod=hood.modifiers.new('Composite thickness','SOLIDIFY');mod.thickness=.025
for side in [-1,1]:
 v=[];f=[];steps=48
 for i in range(steps+1):
  a=math.radians(-9+198*i/steps)
  for y,r in [(side*.87,.665),(side*1.255,.665),(side*.87,.785),(side*1.255,.785)]:v.append((2.35+r*math.cos(a),y,.60+r*math.sin(a)))
 for i in range(steps):
  for a,b in [(0,1),(1,3),(3,2),(2,0)]:f.append((4*i+a,4*i+b,4*(i+1)+b,4*(i+1)+a))
 f.extend([(0,2,3,1),(steps*4,steps*4+1,steps*4+3,steps*4+2)]);mesh('Front wheel arch',v,f,PAINT,.025,True)
 profile('Hood side intake',[(1.42,1.94),(2.33,1.80),(2.75,1.51),(2.23,1.63)],.015,BLACK,side*.975,.015)
 for i in range(8):
  x=1.55+i*.105;z=1.90-i*.034;tube('Intake louvre',[(x,side*.987,z),(x+.07,side*.987,z-.08)],.007,STEEL)
 box('Hood mirror base',(2.63,side*.85,1.85),(.18,.12,.065),BLACK,.025);tube('Hood mirror arm',[(2.63,side*.85,1.86),(2.66,side*1.10,2.02),(2.59,side*1.30,2.08)],.022,CHROME);box('Hood mirror housing',(2.58,side*1.31,2.10),(.16,.22,.14),CHROME,.05);box('Hood mirror glass',(2.491,side*1.31,2.10),(.008,.17,.095),MIRROR,.025)
outer=[(-.72,.78),(.72,.78),(.75,1.53),(.65,1.70),(-.65,1.70),(-.75,1.53)];inner=[(-.65,.84),(.65,.84),(.68,1.50),(.59,1.63),(-.59,1.63),(-.68,1.50)];ring_x('Chrome grille surround',3.50,outer,inner,CHROME,.065);mesh('Grille backing',[(3.477,y,z) for y,z in inner],[tuple(range(6))],BLACK)
r=.04
for row in range(13):
 z=.88+row*r*1.5
 for col in range(18):
  y=-.61+col*math.sqrt(3)*r+(row%2)*math.sqrt(3)*r/2
  if abs(y)>.62 or z>1.59:continue
  tube('Hexagonal grille cell',[(3.516,y+r*math.sin(i*TAU/6),z+r*math.cos(i*TAU/6)) for i in range(6)],.0034,ALU,True)
tube('Volvo diagonal slash',[(3.558,-.62,.86),(3.558,.62,1.62)],.018,CHROME);torus('Volvo emblem ring',(3.579,0,1.24),.080,.013,CHROME,'X');box('Volvo emblem bar',(3.594,0,1.24),(.015,.18,.052),BLACK,.006);label('Volvo logo','VOLVO',(3.607,0,1.24),.031,CHROME,(PI/2,0,PI/2))
for side in [-1,1]:
 outline=[(side*.79,.83),(side*1.14,.82),(side*1.15,1.03),(side*.98,1.32),(side*.81,1.43)]
 mesh('Headlamp black housing',[(3.34-.16*(abs(y)-.79),y,z) for y,z in outline],[tuple(range(5))],BLACK,.015)
 for y,z,r in [(.91,1.10,.064),(.985,.95,.058)]:
  cyl('Projector reflector',(3.355,side*y,z),r+.014,.035,CHROME,'X');cyl('Projector lens',(3.377,side*y,z),r,.012,LENS,'X');torus('Projector trim',(3.386,side*y,z),r,.006,CHROME,'X')
 tube('Headlight LED light guide',[(3.39,side*.83,1.39),(3.39,side*.97,1.28),(3.34,side*1.10,1.04),(3.33,side*1.10,.87)],.011,LED)
 box('Fender indicator',(2.83,side*1.215,.98),(.19,.025,.045),AMBER,.015)
parent_new(before,HOOD);HOOD.rotation_euler.y=math.radians(OPEN_HOOD)

# Close the hood sides around the arches and integrate the nose panels.
collection('06 Hood fenders grille and headlamps')
for side in [-1,1]:
 outline=[(1.04,2.02),(1.45,1.99),(2.30,1.82),(3.02,1.62),(3.45,1.55),(3.45,.76),(3.14,.65)]
 outline += [(2.35+.79*math.cos(math.radians(a)),.60+.79*math.sin(math.radians(a))) for a in range(0,181,6)]
 outline += [(1.04,1.16)]
 panel=profile('Hood side composite panel',outline,.065,PAINT,side*1.005,.025);bpy.context.view_layer.update();parent(panel,HOOD)
# Front fascia wraps the grille and lamps; grille recess is an actual opening.
fascia=loft('Integrated nose fascia',[(3.12,1.08,.74,1.73),(3.36,1.12,.74,1.72),(3.48,.99,.74,1.66)],PAINT,.025)
cut(fascia,box('Grille recess cutter',(3.45,0,1.24),(.95,1.39,.84),BLACK,0))
bpy.context.view_layer.update();parent(fascia,HOOD)
# Bring projector modules and their black housings flush with the fascia.
for o in list(C['06 Hood fenders grille and headlamps'].objects):
 if o.name.startswith(('Headlamp black housing','Projector reflector','Projector lens','Projector trim','Headlight LED light guide')):
  o.location.x += .135
# Fill the triangular roof shoulder above the sleeper sidewalls.
collection('04 Cabin shell and glazing')
for side in [-1,1]:
 profile('Roof shoulder panel',[(-1.98,3.58),(-1.98,3.9),(-1.7,4.01),(-.93,4.01),(-.25,3.83),(.34,3.49),(.55,3.14),(-.28,3.14),(-.28,3.60)],.065,PAINT,side*1.12,.035)
collection('07 Bumper and side fairings')
loft('Front bumper',[(3.02,1.13,.29,.74),(3.35,1.18,.29,.75),(3.62,1.04,.31,.72)],PAINT,.045);box('Lower bumper intake',(3.66,0,.465),(.035,1.40,.18),BLACK,.035)
for y in [-.55,-.27,0,.27,.55]:box('Lower grille upright',(3.684,y,.465),(.022,.025,.145),STEEL,.006)
tube('Lower bumper lip',[(3.49,-1.02,.30),(3.68,-.70,.28),(3.71,0,.28),(3.68,.70,.28),(3.49,1.02,.30)],.035,BLACK)
for side in [-1,1]:
 box('Bumper chrome insert',(3.535,side*.91,.53),(.06,.24,.30),CHROME,.045);box('Foglamp recess',(3.574,side*.91,.53),(.023,.17,.21),BLACK,.028);cyl('Fog projector',(3.594,side*.91,.55),.061,.012,LENS,'X');box('Bumper DRL',(3.602,side*.91,.445),(.012,.13,.024),LED,.01)
 box('Tank fairing',(-.68,side*1.12,.69),(2.65,.25,.59),PAINT,.075)
 for x in [-1.84,-.85,.1]:tube('Fairing panel gap',[(x,side*1.252,.43),(x,side*1.252,.95)],.005,BLACK)
 for z,x,l in [(.67,.49,.72),(1.01,.55,.66)]:
  box('Step recess',(x,side*1.13,z+.035),(l+.08,.27,.16),BLACK,.025);box('Access step',(x,side*1.24,z),(l,.31,.075),ALU,.018)
  for i in range(11):
   for j in range(3):box('Step perforation',(x-l*.43+i*l*.086,side*(1.13+j*.073),z+.04),(.028,.027,.006),BLACK,.005)
 for x in [-1.66,-1.16,-.66,-.16]:box('Fairing marker',(x,side*1.254,.72),(.105,.018,.027),AMBER,.01)

collection('08 Driving compartment')
def seat(x,y):
 box('Seat pedestal',(x,y,1.42),(.45,.43,.23),BLACK)
 for yy in [y-.16,y+.16]:box('Seat slide rail',(x,yy,1.34),(.56,.035,.04),STEEL)
 for z in [1.41,1.46,1.51]:box('Seat air suspension fold',(x,y,z),(.42,.40,.025),RUBBER,.02)
 box('Seat cushion',(x+.03,y,1.66),(.61,.54,.16),FABRIC,.075);box('Seat back',(x-.23,y,2.02),(.16,.55,.72),FABRIC,.065,(0,-.08,0));box('Headrest',(x-.26,y,2.47),(.18,.36,.22),FABRIC,.055)
 for side in [-1,1]:
  box('Cushion bolster',(x+.03,y+side*.24,1.70),(.55,.085,.15),LEATHER,.04);box('Seat back bolster',(x-.16,y+side*.24,2.02),(.14,.085,.62),LEATHER,.04);box('Seat armrest',(x-.02,y+side*.32,1.96),(.44,.095,.09),LEATHER,.035)
 for yy in [y-.14,y,y+.14]:tube('Seat stitching',[(x-.18,yy,1.747),(x+.26,yy,1.747)],.0025,TRIM)
 tube('Seatbelt',[(x-.31,y-.22,2.40),(x-.06,y+.17,1.78),(x+.12,y+.22,1.58)],.017,BLACK);box('Seatbelt buckle',(x+.1,y+.28,1.69),(.07,.045,.09),BLACK,.012);box('Buckle release',(x+.1,y+.28,1.738),(.045,.03,.01),RED,.004)
seat(.03,-.65);seat(.03,.65)
profile('Dashboard',[(.74,1.45),(1.07,1.47),(1.08,2.13),(.82,2.16),(.53,1.95),(.53,1.67)],2.10,DASH,b=.045);box('Instrument hood',(.58,-.63,2.02),(.43,.67,.10),BLACK,.035);box('Instrument cluster',(.435,-.64,1.91),(.024,.59,.24),BLACK,.025)
for y,r in [(-.83,.081),(-.45,.081),(-.70,.042),(-.57,.042)]:
 cyl('Gauge face',(.414,y,1.91),r,.009,BLACK,'X');torus('Gauge bezel',(.405,y,1.91),r,.004,ALU,'X')
 for i in range(13):
  a=math.radians(-130+i*260/12);rod('Gauge tick',(.398,y+r*.78*math.sin(a),1.91+r*.78*math.cos(a)),(.398,y+r*.91*math.sin(a),1.91+r*.91*math.cos(a)),.0015,LED)
 rod('Gauge needle',(.392,y,1.91),(.392,y+r*.55,1.91+r*.24),.002,RED)
box('Central display',(.506,.10,1.94),(.025,.39,.23),SCREEN,.014)
for row in range(4):box('Display interface line',(.490,.1,1.87+row*.045),(.004,.28,.006),LED,.001)
for y in [-.98,-.25,.4,.91]:
 box('Air vent',(.526,y,1.99),(.025,.13,.12),BLACK,.012)
 for z in [1.955,1.98,2.005,2.03]:box('Vent slat',(.508,y,z),(.016,.11,.006),ALU,.002)
for row in range(3):
 for col in range(5):box('Console switch',(.515,-.03+col*.075,1.74+row*.048),(.025,.052,.029),BLACK,.005)
for y in [.02,.15,.28]:
 cyl('HVAC dial',(.492,y,1.64),.035,.035,BLACK,'X');rod('HVAC dial mark',(.468,y,1.65),(.468,y,1.668),.002,LED)
box('Glove compartment',(.543,.72,1.73),(.025,.48,.24),DASH,.018);box('Glovebox handle',(.521,.72,1.82),(.02,.12,.025),BLACK,.007)
steer=empty('Steering wheel assembly',(.31,-.65,1.91));before=set(bpy.data.objects);torus('Steering rim',(.31,-.65,1.91),.205,.022,LEATHER,'X');cyl('Steering airbag',(.31,-.65,1.91),.085,.06,BLACK,'X')
for a in [0,TAU/3,2*TAU/3]:rod('Steering spoke',(.31,-.65+.06*math.cos(a),1.91+.06*math.sin(a)),(.31,-.65+.19*math.cos(a),1.91+.19*math.sin(a)),.017,BLACK)
parent_new(before,steer);steer.rotation_euler.y=math.radians(-20);rod('Steering column',(.38,-.65,1.84),(.77,-.65,1.47),.055,BLACK)
for yy in [-.78,-.62,-.45]:box('Pedal',(.91,yy,1.37),(.11,.085,.025),RUBBER,.008,(0,-.45,0))
for yy in [-.65,.65]:
 box('Floor mat',(.45,yy,1.284),(.73,.66,.012),RUBBER,.025)
 for i in range(9):box('Floor mat rib',(.15+i*.073,yy,1.293),(.012,.56,.004),BLACK,.002)
for y in [-.18,.18]:torus('Cup holder',(.49,y,1.56),.05,.009,BLACK);cyl('Cup holder floor',(.49,y,1.53),.047,.01,BLACK)
box('Overhead console',(.36,0,3.08),(.36,1.80,.13),TRIM,.035)
for y in [-.70,.70]:box('Sun visor',(.51,y,2.98),(.045,.56,.23),LEATHER,.025);box('Cabin light',(.19,y,2.995),(.15,.12,.015),LENS,.015)

collection('09 Sleeper interior')
box('Lower bunk base',(-1.43,0,1.58),(.86,2.10,.47),WOOD,.025);box('Lower mattress',(-1.43,0,1.87),(.86,2.08,.18),BED,.075)
for y in [-.7,.7]:box('Pillow',(-1.44,y,2.02),(.56,.42,.12),TRIM,.07)
box('Folded blanket',(-1.41,0,2),(.74,.86,.08),FABRIC,.025)
for i in range(7):tube('Blanket quilting',[(-1.73+i*.105,-.4,2.045),(-1.73+i*.105,.4,2.045)],.0025,TRIM)
box('Upper bunk base',(-1.45,0,3.10),(.83,2.06,.09),WOOD);box('Upper mattress',(-1.45,0,3.19),(.81,2.02,.12),BED,.045);tube('Upper bunk retaining rail',[(-1.01,-1.03,3.26),(-1.01,1.03,3.26)],.018,ALU)
for side in [-1,1]:
 box('Sleeper cabinet',(-.65,side*.91,2.09),(.56,.40,1.61),WOOD,.025);box('Cabinet door',(-.35,side*.91,2.27),(.025,.35,.92),TRIM,.015);box('Cabinet handle',(-.325,side*.91,2.23),(.025,.13,.025),CHROME,.007)
 cyl('Reading lamp',(-1.81,side*.76,2.43),.055,.045,ALU,'X');cyl('Reading lamp lens',(-1.777,side*.76,2.43),.038,.008,LENS,'X')
 rod('Curtain rail',(-.78,side*.55,2.94),(-.78,side*1.04,2.94),.015,ALU)
 for i in range(14):
  y=side*(.84+i*.015);tube('Curtain pleat',[(-.78+.013*(i%2),y,2.92),(-.80+.013*(i%2),y,1.39)],.018,FABRIC)
box('Mini fridge',(-.47,.88,1.62),(.39,.43,.57),BLACK);box('Fridge door',(-.255,.88,1.62),(.025,.38,.52),ALU);box('Fridge handle',(-.228,.88,1.80),(.02,.23,.025),BLACK)
box('Fold out table',(-.66,-.59,1.89),(.59,.57,.055),WOOD,.035);rod('Table support',(-.67,-.60,1.31),(-.67,-.60,1.86),.025,ALU);box('Sleeper controls',(-1.817,-.53,2.22),(.025,.27,.14),BLACK)
for y in [-.61,-.53,-.45]:box('Sleeper switch',(-1.8,y,2.22),(.015,.045,.04),ALU,.005)
for y in [-.33,.33]:rod('Bunk ladder upright',(-.96,y,1.3),(-1.02,y,3.08),.018,ALU)
for z in [1.52,1.91,2.3,2.69]:rod('Bunk ladder rung',(-.98,-.33,z),(-.98,.33,z),.022,ALU)

collection('10 Fifth wheel and rear details')
for side in [-1,1]:box('Fifth wheel support',(-3,side*.36,1.10),(.94,.18,.16),STEEL)
fifth=cyl('Fifth wheel coupling',(-3,0,1.23),.61,.09,STEEL);cut(fifth,box('Coupling slot',(-3.47,0,1.23),(.65,.13,.25),BLACK,0))
for side in [-1,1]:tube('Fifth wheel grease channel',[(-2.57,side*.18,1.279),(-2.74,side*.37,1.279),(-3.13,side*.43,1.279)],.008,BLACK)
rod('Fifth wheel release handle',(-3.02,.38,1.15),(-3.02,.88,1.15),.021,STEEL)
for x in [-2.15,-1.99,-1.83]:
 box('Catwalk plate',(x,0,1.08),(.13,1.54,.045),ALU,.008)
 for i in range(-6,7):box('Catwalk perforation',(x,i*.12,1.106),(.055,.055,.004),BLACK,.004)
for i,m in enumerate([RED,AMBER,BLACK]):
 x=-2.10-i*.08;y=-.35+i*.3;pts=[]
 for j in range(361):
  t=j/360;a=t*TAU*18;pts.append((x+.055*math.cos(a),y+.055*math.sin(a),1.4+.82*t))
 tube('Coiled connection hose',pts,.009,m);tube('Hose end',[(x,y,1.4),(-2.35,y,1.22)],.009,m)
for side in [-1,1]:
 for x in [-2.82,-4.15]:tube('Rear wheel fender edge',[(x+.67*math.cos(math.radians(18+j*4)),side*1.18,.60+.67*math.sin(math.radians(18+j*4))) for j in range(37)],.035,BLACK)
 box('Rear mudflap',(-4.82,side*1.08,.51),(.045,.62,.82),RUBBER,.012);box('Mudflap mounting bar',(-4.82,side*1.08,.93),(.09,.65,.045),STEEL,.008)
 for y,m in [(.59,RED),(.78,AMBER)]:cyl('Rear lamp',(-4.881,side*y,.87),.065,.025,m,'X')
 box('Rear reflector',(-4.883,side*.36,.85),(.018,.13,.055),RED,.01)
box('Rear frame crossmember',(-4.79,0,.86),(.15,1.83,.24),STEEL)

# Keep cooling accessories completely under the closed hood.
for o in C['03 Engine and transmission'].objects:o.location.z-=.16
collection('04 Cabin shell and glazing')
for side in [-1,1]:
 profile('Door header panel',[(-.29,3.00),(.53,3.00),(.58,3.18),(.30,3.36),(-.29,3.38)],.085,PAINT,side*1.15,.025)
# Move the intake inserts to the outer skin of the side panels.
for o in C['06 Hood fenders grille and headlamps'].objects:
 if o.name.startswith(('Hood side intake','Intake louvre')):
  if o.type=='CURVE':
   yy=o.data.splines[0].points[0].co.y;o.location.y+=(.065 if yy>0 else -.065)
  else:o.location.y+=(.065 if o.location.y>0 else -.065)
collection('00 Model controls')
ROOT=empty('VOLVO VNL 760',(0,0,0));ROOT['model_type']='Procedural photographic approximation';ROOT['factory_dimensions']=False;ROOT['interior']=True;ROOT['engine']=True;ROOT['units']='meters'
bpy.context.view_layer.update()
for c in C.values():
 if c.name=='00 Model controls':continue
 for o in c.objects:
  if o.parent is None:parent(o,ROOT)
# Door and hood controls are keyframed for inspection in Blender.
for o,side in DOORS:
 o.rotation_euler.z=-side*math.radians(OPEN_DOORS);o.keyframe_insert(data_path='rotation_euler',frame=1);o.rotation_euler.z=-side*math.radians(65);o.keyframe_insert(data_path='rotation_euler',frame=80)
HOOD.rotation_euler.y=math.radians(OPEN_HOOD);HOOD.keyframe_insert(data_path='rotation_euler',frame=1);HOOD.rotation_euler.y=math.radians(55);HOOD.keyframe_insert(data_path='rotation_euler',frame=80)
S.frame_end=80;S.frame_set(1)

collection('11 Studio')
FLOOR=mat('Studio floor',(.16,.18,.21),0,.65);box('Studio floor',(0,0,-.075),(200,200,.12),FLOOR,0)
def camera(n,loc,target,lens=55):
 bpy.ops.object.camera_add(location=loc);o=finish(bpy.context.object,n);o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();o.data.lens=lens;o.data.clip_start=.025;o.data.clip_end=300;return o

def area(n,loc,target,power,size,color):
 bpy.ops.object.light_add(type='AREA',location=loc);o=finish(bpy.context.object,n);o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=color;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();return o
MAIN=camera('Exterior camera',(11.8,-13,6.6),(-.45,0,1.85),56);CAB=camera('Interior camera',(-.60,.18,2.62),(.7,-.47,1.89),20);SLEEP=camera('Sleeper camera',(-.85,.60,2.70),(-1.65,-.15,2.4),16);ENG=camera('Engine camera',(4.7,-3.5,3.6),(1.9,0,1.34),52);camera('Rear camera',(-10.5,-9.7,5.4),(-1.3,0,1.65),55)
area('Key softbox',(5,-6,9),(0,0,1.6),2400,7,(.88,.93,1));area('Roof softbox',(-2,1,10),(-1,0,1.7),2900,7,(1,.96,.9));area('Rim softbox',(-5,5,6),(-1,0,2),2500,5,(.8,.88,1));area('Fill softbox',(5,4,4),(1,0,1.5),1500,5,(1,1,1))
C['11 Studio'].objects.get('Key softbox').visible_glossy=False
C['11 Studio'].objects.get('Fill softbox').visible_glossy=False
S.camera=MAIN;S.world.use_nodes=True;bg=S.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.24,.29,.37,1);bg.inputs['Strength'].default_value=.35
S.render.engine='CYCLES';S.cycles.samples=64;S.cycles.use_denoising=False;S.cycles.max_bounces=10;S.cycles.transmission_bounces=8;S.render.resolution_x=1500;S.render.resolution_y=1000;S.render.resolution_percentage=100;S.render.image_settings.file_format='PNG';PREVIEWS=Path(os.environ.get('VOLVO_PREVIEWS',str(OUT.parent/'previews')));PREVIEWS.mkdir(parents=True,exist_ok=True);S.render.filepath=str(PREVIEWS/'Volvo_VNL_760_preview.png');S.view_settings.view_transform='AgX'
# Export model only; scene, cameras and studio stay in BLEND.
bpy.ops.object.select_all(action='DESELECT')
def select_tree(o):
 o.select_set(True)
 for ch in o.children:select_tree(ch)
select_tree(ROOT);bpy.context.view_layer.objects.active=ROOT
bpy.ops.export_scene.gltf(filepath=str(OUT/'Volvo_VNL_760.glb'),export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_animations=False)
for scr in bpy.data.screens:
 for ar in scr.areas:
  if ar.type=='VIEW_3D':ar.spaces.active.region_3d.view_distance=13;ar.spaces.active.region_3d.view_location=Vector((-.4,0,1.8))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Volvo_VNL_760.blend'),compress=True)
print('BUILD COMPLETE',len(bpy.data.objects),flush=True)
bpy.ops.render.render(write_still=True)
print('RENDER COMPLETE',flush=True)
