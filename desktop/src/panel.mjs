import {TruckScene} from './truck-scene.mjs';
const truck=new TruckScene(document.querySelector('canvas'),{preview:true});
let state={},last=performance.now();
const status=document.querySelector('#status');
window.truck.onState(data=>{
 state=data;truck.state=data;
 for(const button of document.querySelectorAll('[data-toggle]')){const active=!!data[button.dataset.toggle];button.setAttribute('aria-pressed',String(active));}
 for(const name of ['speed','size','mode']){const input=document.querySelector(`[name="${name}"]`);if(document.activeElement!==input)input.value=data[name];}
 document.querySelector('#speed-value').textContent=`${data.speed} px/с`;
 document.querySelector('#size-value').textContent=`${data.size} px`;
 document.querySelector('#pause-label').textContent=data.paused?'Продолжить поездку':'Пауза';
 status.textContent=data.nativeReady?'Окна подключены':'Езда по рабочему столу';
});
window.truck.onError(message=>{document.querySelector('#notice').textContent=message;});
for(const button of document.querySelectorAll('[data-toggle]'))button.addEventListener('click',()=>window.truck.command(button.dataset.toggle,!state[button.dataset.toggle]));
for(const button of document.querySelectorAll('[data-command]'))button.addEventListener('click',()=>window.truck.command(button.dataset.command));
for(const input of document.querySelectorAll('input,select'))input.addEventListener('input',()=>window.truck.command(input.name,input.type==='range'?Number(input.value):input.value));
for(const button of document.querySelectorAll('[data-direction]'))button.addEventListener('click',()=>window.truck.command('direction',Number(button.dataset.direction)));
function animate(now){truck.update(Math.min(.08,(now-last)/1000));last=now;requestAnimationFrame(animate);}
truck.load().then(()=>{window.truck.ready();requestAnimationFrame(animate);}).catch(e=>{document.querySelector('#notice').textContent=e.message;console.error(e);});

if(globalThis.__TRUCK_TEST__)globalThis.__truckScene=truck;
