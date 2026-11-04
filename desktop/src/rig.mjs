import * as THREE from 'three';
const key=name=>name.toLowerCase().replace(/[^a-z0-9]/g,'');
export function createRig(model) {
  const nodes=[];model.traverse(o=>nodes.push(o));
  const find=name=>nodes.find(o=>key(o.name)===key(name));
  const hood=find('Hood hinge'),left=find('Door hinge L'),right=find('Door hinge R');
  const glass=nodes.filter(o=>/^doorglazing\d*$/.test(key(o.name)));
  const wheels=nodes.filter(o=>/^wheelspin\d+$/.test(key(o.name))).sort((a,b)=>key(a.name).localeCompare(key(b.name)));
  if(!hood||!left||!right||glass.length!==2||wheels.length!==10)
    throw new Error('В модели не найдены двери, стёкла, капот или колёса.');
  const start=new Map([hood,left,right,...wheels].map(o=>[o,o.quaternion.clone()]));
  const glassY=new Map(glass.map(o=>[o,o.position.y]));
  const values={hood:0,doorLeft:0,doorRight:0,windowLeft:0,windowRight:0};
  const wheelPositions=new Map(wheels.map(o=>[o,o.position.clone()]));
  const tireMaterials=wheels.map(w=>{const mats=[];w.traverse(o=>{if(!o.isMesh)return;const clone=m=>{if(m.name!=='Rubber')return m;const copy=m.clone();mats.push(copy);return copy;};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);});return mats;});
  let roll=0;
  function apply(pose,dt=1/30,distance=0) {
    const rate=1-Math.exp(-dt*7);
    for(const k of Object.keys(values))values[k]+=(Number(Boolean(pose[k]))-values[k])*rate;
    const turn=(o,axis,angle)=>o.quaternion.copy(start.get(o)).multiply(new THREE.Quaternion().setFromAxisAngle(axis,angle));
    turn(hood,new THREE.Vector3(0,0,-1),THREE.MathUtils.degToRad(55)*values.hood);
    turn(left,new THREE.Vector3(0,1,0),THREE.MathUtils.degToRad(65)*values.doorLeft);
    turn(right,new THREE.Vector3(0,1,0),THREE.MathUtils.degToRad(-65)*values.doorRight);
    for(const o of glass){const name=o.parent===left?'windowLeft':'windowRight';o.position.y=glassY.get(o)-values[name]*.76;}
    roll=(roll+distance/.59)%(Math.PI*2);
    for(const [i,wheel] of wheels.entries()){
      turn(wheel,new THREE.Vector3(0,0,-1),roll);wheel.position.copy(wheelPositions.get(wheel));wheel.visible=true;
      const job=pose.service;
      if(job?.type==='wheel'&&job.wheel===i){
        const p=THREE.MathUtils.clamp(job.progress,0,1);
        const out=p<.5?THREE.MathUtils.smoothstep(p,.16,.42):1-THREE.MathUtils.smoothstep(p,.60,.88);
        wheel.position.z+=Math.sign(wheelPositions.get(wheel).z)*out*.65;
        wheel.position.x+=out*.75;wheel.position.y-=out*.06;
        wheel.visible=!(p>=.46&&p<.58);
      }
      const wear=1-(pose.maintenance?.tires?.[i]??100)/100;
      for(const m of tireMaterials[i]){m.color.setRGB(.012+wear*.13,.015+wear*.105,.018+wear*.075);m.roughness=.79+wear*.17;}
    }
  }
  function action(object){
    if(glass.includes(object))return object.parent===left?'windowLeft':'windowRight';
    for(let o=object;o;o=o.parent){if(o===hood)return 'hood';if(o===left)return 'doorLeft';if(o===right)return 'doorRight';}
    return null;
  }
  return {hood,left,right,glass,wheels,values,apply,action};
}
