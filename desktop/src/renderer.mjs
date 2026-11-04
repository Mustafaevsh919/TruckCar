import {TruckScene} from './truck-scene.mjs';
const canvas=document.querySelector('canvas'),error=document.querySelector('#error');
const truck=new TruckScene(canvas);let state={},last=performance.now(),dragStart=null,moved=false,hover=false;
truck.onMetrics=data=>window.truck.metrics(data);
window.truck.onState(data=>{state=data;truck.state=data;});
window.truck.onMotion(data=>truck.motion(data));
window.truck.onPointer(p=>{const hit=p.inside&&!!truck.hit(p.x,p.y);if(hit!==hover){hover=hit;window.truck.hover(hit);}});
canvas.addEventListener('pointerdown',e=>{if(e.button!==0||!truck.hit(e.offsetX,e.offsetY))return;dragStart={x:e.screenX,y:e.screenY};moved=false;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!dragStart)return;if(!moved&&Math.hypot(e.screenX-dragStart.x,e.screenY-dragStart.y)>5){moved=true;window.truck.drag(true);}});
canvas.addEventListener('pointerup',e=>{
 if(!dragStart)return;
 if(moved)window.truck.drag(false);
 else{const hit=truck.hit(e.offsetX,e.offsetY),action=hit&&truck.rig.action(hit.object);if(action)window.truck.command(action,!state[action]);}
 dragStart=null;try{canvas.releasePointerCapture(e.pointerId);}catch{}
});
canvas.addEventListener('lostpointercapture',()=>{if(moved)window.truck.drag(false);dragStart=null;moved=false;});
canvas.addEventListener('dblclick',()=>window.truck.command('panel'));
canvas.addEventListener('contextmenu',e=>{e.preventDefault();window.truck.command('menu');});
function animate(now){const dt=Math.min(.08,(now-last)/1000);last=now;truck.update(dt);requestAnimationFrame(animate);}
truck.load().then(()=>{truck.update(1/30);truck.renderer.getContext().finish();window.truck.ready();requestAnimationFrame(animate);}).catch(e=>{error.textContent='Не удалось открыть грузовик. Перезапустите приложение.';console.error(e);window.truck.hover(true);});

if(globalThis.__TRUCK_TEST__)globalThis.__truckScene=truck;
