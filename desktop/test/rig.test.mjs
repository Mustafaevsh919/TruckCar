import {gunzipSync} from 'node:zlib';
import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import * as THREE from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {createRig} from '../src/rig.mjs';
globalThis.ProgressEvent??=class ProgressEvent{constructor(type,values){this.type=type;Object.assign(this,values);}};
const data=gunzipSync(await readFile(new URL('../app/assets/truck.glb.gz',import.meta.url)));
const asset=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
const rig=createRig(asset.scene);
test('runtime model retains all controls and ten tire pivots in a small draw graph',()=>{
 let count=0;asset.scene.traverse(o=>{if(o.isMesh)count++;});assert(count<130);assert.equal(rig.wheels.length,10);assert.equal(rig.glass.length,2);
});
test('doors, glass and hood move independently and return exactly to the closed pose',()=>{
 const before=rig.glass.map(o=>o.position.y);rig.apply({doorLeft:true,windowLeft:true,hood:true},10);
 assert(rig.left.quaternion.y>.4);assert(Math.abs(rig.right.quaternion.y)<1e-6);assert(rig.hood.quaternion.z<-.4);
 const li=rig.glass.findIndex(o=>o.parent===rig.left);assert(Math.abs(rig.glass[li].position.y-before[li]+.76)<1e-6);
 const ri=1-li;assert.equal(rig.glass[ri].position.y,before[ri]);
 assert.equal(rig.action(rig.glass[li]),'windowLeft');assert.equal(rig.action(rig.hood.children[0]),'hood');
 rig.apply({},10);assert(Math.abs(rig.left.quaternion.y)<1e-6);assert(Math.abs(rig.hood.quaternion.z)<1e-6);
 for(let i=0;i<2;i++)assert(Math.abs(rig.glass[i].position.y-before[i])<1e-6);
});
test('wheel rotation follows distance and the hood opens away from the engine',()=>{
 asset.scene.updateMatrixWorld(true);const before=new THREE.Vector3(-2,1,0).applyMatrix4(rig.hood.matrixWorld);
 rig.apply({hood:true},10,.59*Math.PI);asset.scene.updateMatrixWorld(true);
 const after=new THREE.Vector3(-2,1,0).applyMatrix4(rig.hood.matrixWorld);assert(after.y>before.y+.5);
 assert(Math.abs(rig.wheels[0].quaternion.z)>.99);
});
test('selected wheel is removed and reattached during replacement without disturbing others',()=>{
 rig.apply({},10);const before=rig.wheels.map(w=>w.position.clone());
 rig.apply({service:{type:'wheel',wheel:0,progress:.35}},.1);assert(rig.wheels[0].position.distanceTo(before[0])>.3);assert(rig.wheels[1].position.equals(before[1]));
 rig.apply({service:{type:'wheel',wheel:0,progress:.52}},.1);assert.equal(rig.wheels[0].visible,false);
 rig.apply({service:{type:'wheel',wheel:0,progress:.96}},.1);assert.equal(rig.wheels[0].visible,true);assert(rig.wheels[0].position.distanceTo(before[0])<1e-6);
});
test('burnout rotates rear driven wheels only and stops when hover ends',()=>{rig.apply({},.1);const front=rig.wheels[0].quaternion.clone(),rear=rig.wheels[3].quaternion.clone();rig.apply({},.1,0,true);assert(rig.wheels[0].quaternion.angleTo(front)<1e-6);assert(rig.wheels[3].quaternion.angleTo(rear)>.5);const stopped=rig.wheels[3].quaternion.clone();rig.apply({},.1,0,false);assert(rig.wheels[3].quaternion.angleTo(stopped)<1e-6);});
