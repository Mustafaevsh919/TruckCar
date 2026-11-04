import * as THREE from 'three';
const key=name=>name.toLowerCase().replace(/[^a-z0-9]/g,'');
export function createRig(model) {
  const nodes=[];model.traverse(o=>nodes.push(o));
  const find=name=>nodes.find(o=>key(o.name)===key(name));
  const hood=find('Hood hinge'),left=find('Door hinge L'),right=find('Door hinge R');
  const glass=nodes.filter(o=>/^doorglazing\d*$/.test(key(o.name)));
  const wheels=nodes.filter(o=>/^wheelspin\d+$/.test(key(o.name)));
  if(!hood||!left||!right||glass.length!==2||wheels.length!==10)
    throw new Error('В модели не найдены двери, стёкла, капот или колёса.');
  const start=new Map([hood,left,right,...wheels].map(o=>[o,o.quaternion.clone()]));
  const glassY=new Map(glass.map(o=>[o,o.position.y]));
  const values={hood:0,doorLeft:0,doorRight:0,windowLeft:0,windowRight:0};
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
    for(const wheel of wheels)turn(wheel,new THREE.Vector3(0,0,-1),roll);
  }
  function action(object){
    if(glass.includes(object))return object.parent===left?'windowLeft':'windowRight';
    for(let o=object;o;o=o.parent){if(o===hood)return 'hood';if(o===left)return 'doorLeft';if(o===right)return 'doorRight';}
    return null;
  }
  return {hood,left,right,glass,wheels,values,apply,action};
}
