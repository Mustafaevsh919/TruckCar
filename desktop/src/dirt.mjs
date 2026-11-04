import * as THREE from 'three';
export function createDirt(materials){
 const uniforms={amount:{value:0},inverse:{value:new THREE.Matrix4()}};
 const eligible=new Set(['Silver blue metallic','Chrome','Aluminium','Black plastic','Rubber','Chassis steel']);
 for(const material of materials){
  if(!eligible.has(material.name))continue;
  material.onBeforeCompile=shader=>{
   shader.uniforms.uTruckDirt=uniforms.amount;shader.uniforms.uTruckDirtInverse=uniforms.inverse;
   shader.vertexShader='varying vec3 vTruckDirt;uniform mat4 uTruckDirtInverse;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvTruckDirt=(uTruckDirtInverse*modelMatrix*vec4(transformed,1.0)).xyz;');
   shader.fragmentShader=`varying vec3 vTruckDirt;uniform float uTruckDirt;
   float truckHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
   float truckNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
    return mix(mix(mix(truckHash(i),truckHash(i+vec3(1,0,0)),f.x),mix(truckHash(i+vec3(0,1,0)),truckHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(truckHash(i+vec3(0,0,1)),truckHash(i+vec3(1,0,1)),f.x),mix(truckHash(i+vec3(0,1,1)),truckHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
   `+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float truckGrain=.65*truckNoise(vTruckDirt*4.0)+.35*truckNoise(vTruckDirt*17.0);
    float truckThreshold=1.05-uTruckDirt;
    float truckHeight=mix(1.0,.48,smoothstep(.6,3.8,vTruckDirt.y));
    float truckMud=clamp(smoothstep(truckThreshold-.12,truckThreshold+.12,truckGrain)*uTruckDirt*truckHeight,0.0,.94);
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.13,.063,.026)*(0.72+truckGrain*.55),truckMud);`)
    .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.98,truckMud);')
    .replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=mix(metalnessFactor,.03,truckMud);');
  };
  material.customProgramCacheKey=()=> 'truck-dirt-v1';material.needsUpdate=true;
 }
 return uniforms;
}
