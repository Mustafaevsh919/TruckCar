import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createRig} from './rig.mjs';
import {createDirt} from './dirt.mjs';
import {TireSmoke} from './smoke.mjs';

export class TruckScene {
 constructor(canvas,{preview=false}={}) {
  this.canvas=canvas;this.preview=preview;this.state={lights:true};this.travel=0;this.heading=0;this.targetHeading=0;this.turn=null;this.burnout=false;
  this.renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setClearColor(0,0);
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;
  this.scene=new THREE.Scene();this.vehicle=new THREE.Group();this.scene.add(this.vehicle);
  const env=new RoomEnvironment();const pmrem=new THREE.PMREMGenerator(this.renderer);
  this.environment=pmrem.fromScene(env,.04);this.scene.environment=this.environment.texture;env.dispose();pmrem.dispose();
  this.scene.add(new THREE.HemisphereLight(0xe8f4ff,0x556471,2.5));
  const key=new THREE.DirectionalLight(0xfff6e7,3.5);key.position.set(4,8,6);this.scene.add(key);
  const rim=new THREE.DirectionalLight(0x8cbaff,1.7);rim.position.set(-6,5,-5);this.scene.add(rim);
  this.camera=new THREE.OrthographicCamera(-6,6,4,-4,.1,100);
  this.camera.position.set(preview?10:0,preview?6.2:1.85,preview?14:18);this.camera.lookAt(0,preview?1.8:1.85,0);
  if(preview){this.controls=new OrbitControls(this.camera,canvas);this.controls.target.set(0,1.8,0);this.controls.enableDamping=true;this.controls.enablePan=false;this.controls.minZoom=.65;this.controls.maxZoom=2.7;this.controls.update();}
  this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.meshes=[];
  this.resize();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);
 }
 async load(){
  const gltf=await new GLTFLoader().loadAsync(new URL('../assets/truck.glb',import.meta.url).href);
  this.model=gltf.scene;
  const box=new THREE.Box3().setFromObject(this.model,true),center=box.getCenter(new THREE.Vector3());
  this.model.position.x-=center.x;this.model.position.z-=center.z;this.model.position.y-=box.min.y;
  this.vehicle.add(this.model);this.rig=createRig(this.model);this.smoke=new TireSmoke(this.scene,this.rig.wheels);
  const materials=new Set();
  this.model.traverse(o=>{if(o.isMesh){this.meshes.push(o);for(const m of (Array.isArray(o.material)?o.material:[o.material]))materials.add(m);}});
  for(const m of materials){
   if(m.name==='Clear automotive glass'){m.transmission=0;m.transparent=true;m.opacity=.34;m.depthWrite=false;m.side=THREE.DoubleSide;m.color.set(0x7296a2);m.roughness=.08;}
   m.envMapIntensity=m.metalness>.5?1.15:.65;
  }
  this.dirt=createDirt(materials);
  this.water=new THREE.InstancedMesh(new THREE.SphereGeometry(.035,6,4),new THREE.MeshBasicMaterial({color:0x98d9ff,transparent:true,opacity:.75}),36);this.water.visible=false;this.scene.add(this.water);
  this.lamps=[...materials].filter(m=>m.name==='LED');
  this.fitMetrics();return this;
 }
 resize(){
  const w=this.canvas.clientWidth||360,h=this.canvas.clientHeight||252;
  this.width=w;this.height=h;this.renderer.setSize(w,h,false);
  const viewHeight=this.preview?6.7:7.1,aspect=w/h;
  this.camera.left=-viewHeight*aspect/2;this.camera.right=viewHeight*aspect/2;
  this.camera.top=viewHeight/2;this.camera.bottom=-viewHeight/2;this.camera.updateProjectionMatrix();
  if(this.model)this.fitMetrics();
 }
 fitMetrics(){
  this.scene.updateMatrixWorld(true);this.camera.updateMatrixWorld(true);
  // Keep the support anchor stable while doors or hood animate.
  const box=new THREE.Box3().setFromObject(this.model,true),points=[];
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z).project(this.camera));
  const xs=points.map(p=>(p.x+1)*this.width/2);
  let foot=0;
  for(const wheel of this.rig.wheels){const p=wheel.getWorldPosition(new THREE.Vector3());p.y-=.60;p.project(this.camera);foot=Math.max(foot,(1-p.y)*this.height/2);}
  this.metrics={foot,footprint:Math.min(this.width-20,Math.max(...xs)-Math.min(...xs))};
  this.onMetrics?.(this.metrics);
 }
 update(dt){
  if(!this.rig)return;
  this.rig.apply(this.state,dt,this.travel,this.burnout);this.travel=0;
  if(!this.preview){
   if(this.turn){this.turn.elapsed=Math.min(.75,this.turn.elapsed+dt);const p=this.turn.elapsed/.75,t=p*p*(3-2*p);this.heading=this.turn.from+this.turn.delta*t;if(p===1){this.heading=this.targetHeading;this.turn=null;}}
   this.vehicle.rotation.y=this.heading;
  }
  this.vehicle.position.y=this.state.service?.type==='wheel'?.08*Math.sin(Math.PI*this.state.service.progress):0;
  for(const m of this.lamps){m.emissive.set(this.state.lights?0xaad8ff:0x000000);m.emissiveIntensity=this.state.lights?1.4:0;}
  const wash=this.state.service?.type==='wash',progress=wash?this.state.service.progress:0;
  this.vehicle.updateMatrixWorld(true);this.smoke.update(dt,this.burnout,this.targetHeading===0?1:-1);this.dirt.inverse.value.copy(this.vehicle.matrixWorld).invert();
  this.dirt.amount.value=(1-(this.state.maintenance?.cleanliness??100)/100)*(1-progress);
  this.water.visible=wash;
  if(wash){const transform=new THREE.Object3D();for(let i=0;i<36;i++){const phase=(progress*5+i*.147)%1;transform.position.set(-4.1+(i%12)*.74,4.8-phase*4.6,((i%3)-1)*.95);transform.scale.set(.7,2,.7);transform.updateMatrix();this.water.setMatrixAt(i,transform.matrix);}this.water.instanceMatrix.needsUpdate=true;}
  this.controls?.update();this.renderer.render(this.scene,this.camera);
 }
 motion(data){
  this.burnout=Boolean(data.burnout);
  const target=data.direction===-1?Math.PI:0;
  if(target!==this.targetHeading){this.targetHeading=target;this.turn={from:this.heading,delta:Math.atan2(Math.sin(target-this.heading),Math.cos(target-this.heading)),elapsed:0};}
  this.travel+=data.distance/(this.width/10);
 }
 hit(x,y){if(!this.rig)return null;this.pointer.set(x/this.width*2-1,1-y/this.height*2);this.ray.setFromCamera(this.pointer,this.camera);return this.ray.intersectObjects(this.meshes,false)[0]||null;}
}
