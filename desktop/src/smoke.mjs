import * as THREE from 'three';

export class TireSmoke {
 constructor(scene,wheels){
  this.scene=scene;this.anchors=[3,5,7,9].map(i=>wheels[i]);this.clock=0;this.next=0;this.credit=0;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,32);
  gradient.addColorStop(0,'rgba(200,208,215,0.85)');gradient.addColorStop(.4,'rgba(180,190,200,0.5)');gradient.addColorStop(1,'rgba(170,182,195,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);this.texture=new THREE.CanvasTexture(canvas);
  this.particles=Array.from({length:28},()=>{
   const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:this.texture,transparent:true,opacity:0,depthWrite:false}));
   sprite.visible=false;scene.add(sprite);return {sprite,age:0,life:1,active:false,velocity:new THREE.Vector3()};
  });
 }
 spawn(direction){
  const i=this.next++%this.particles.length,p=this.particles[i];
  this.anchors[this.next%this.anchors.length].getWorldPosition(p.sprite.position);p.sprite.position.y-=.51;p.sprite.position.z+=Math.sign(p.sprite.position.z)*.24;
  p.sprite.position.x-=direction*.38;
  p.age=0;p.life=.9+(i%5)*.09;p.active=true;p.sprite.visible=true;
  p.velocity.set(-direction*(.48+(i%4)*.045),.60+(i%3)*.08,((i%3)-1)*.07);
 }
 update(dt,emitting,direction){
  dt=Math.min(dt,.1);this.clock+=dt;
  if(emitting){this.credit+=dt;while(this.credit>=.055){this.credit-=.055;this.spawn(direction);}}
  else this.credit=0;
  for(const p of this.particles){
   if(!p.active)continue;p.age+=dt;const t=p.age/p.life;
   if(t>=1){p.active=false;p.sprite.visible=false;continue;}
   p.sprite.position.addScaledVector(p.velocity,dt);p.sprite.scale.setScalar(.20+t*.68);
   p.sprite.material.opacity=.34*Math.sin(Math.PI*t);p.sprite.material.rotation+=dt*.12;
  }
 }
 get activeCount(){return this.particles.filter(p=>p.active).length;}
}
