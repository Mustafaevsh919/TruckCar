'use strict';
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
const number=(v,fallback)=>typeof v==='number'&&Number.isFinite(v)?v:fallback;
class Maintenance {
 constructor(saved={}) {
  this.odometerKm=Math.max(0,number(saved.odometerKm,0));
  this.oil=clamp(number(saved.oil,100));this.engine=clamp(number(saved.engine,100));
  this.tires=Array.from({length:10},(_,i)=>clamp(number(saved.tires?.[i],100)));
  this.cleanliness=clamp(number(saved.cleanliness,100));this.dirtSeconds=Math.max(0,number(saved.dirtSeconds,0))%600;this.washes=Math.max(0,Math.floor(number(saved.washes,0)));
  this.services=Math.max(0,Math.floor(number(saved.services,0)));this.job=null;
 }
 drive(pixels){
  if(this.job||!Number.isFinite(pixels)||pixels<=0)return;
  const km=pixels/2000;this.odometerKm+=km;
  this.engine=clamp(this.engine-km*(.12+(this.oil<20?.65:0)));
  this.oil=clamp(this.oil-km*.7);
  this.tires=this.tires.map((v,i)=>clamp(v-km*(i<2?1.1:1)));
 }
 age(seconds){
  if(!Number.isFinite(seconds)||seconds<=0||this.job?.type==='wash')return;
  this.dirtSeconds+=seconds;const steps=Math.floor(this.dirtSeconds/600);
  if(steps){this.cleanliness=clamp(this.cleanliness-steps*(100/6));this.dirtSeconds%=600;}
 }
 needsStop(){return this.engine<=5||this.oil<=2||this.tires.some(v=>v<=5);}
 begin(type,wheel=0){
  if(this.job||!['engine','wheel','wash'].includes(type))return false;
  if(type==='wheel'&&(!Number.isInteger(wheel)||wheel<0||wheel>=10))return false;
  this.job={type,wheel,elapsed:0,duration:type==='wheel'?7:type==='wash'?6:12};return true;
 }
 tick(seconds){
  if(!this.job||!Number.isFinite(seconds)||seconds<=0)return null;
  this.job.elapsed=Math.min(this.job.duration,this.job.elapsed+seconds);
  if(this.job.elapsed<this.job.duration)return null;
  const done={...this.job};
  if(done.type==='wheel')this.tires[done.wheel]=100;
  else if(done.type==='engine'){this.oil=100;this.engine=100;}
  else{this.cleanliness=100;this.dirtSeconds=0;this.washes++;}
  if(done.type!=='wash')this.services++;this.job=null;return done;
 }
 progress(){return this.job?{...this.job,progress:this.job.elapsed/this.job.duration}:null;}
 snapshot(){return {odometerKm:this.odometerKm,oil:this.oil,engine:this.engine,tires:[...this.tires],services:this.services,cleanliness:this.cleanliness,dirtSeconds:this.dirtSeconds,washes:this.washes};}
}
module.exports={Maintenance};
