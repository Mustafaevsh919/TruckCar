import {HornPlayer} from './horn.mjs';
import {TruckScene} from './truck-scene.mjs';
const truck=new TruckScene(document.querySelector('canvas'),{preview:true});
let state={},last=performance.now();
const status=document.querySelector('#status');
let selectedTab='controls';
function selectTab(tab){
 selectedTab=tab==='state'?'state':'controls';
 for(const b of document.querySelectorAll('[data-tab]')){const selected=b.dataset.tab===selectedTab;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;}
 document.querySelector('#controls-panel').hidden=selectedTab!=='controls';document.querySelector('#state-panel').hidden=selectedTab!=='state';
}
for(const b of document.querySelectorAll('[data-tab]'))b.addEventListener('click',()=>{selectTab(b.dataset.tab);window.truck.command('panel-tab',selectedTab);});
document.querySelector('[role=tablist]').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tab=e.key==='Home'?'controls':e.key==='End'?'state':selectedTab==='state'?'controls':'state';document.querySelector(`#tab-${tab}`).focus();selectTab(tab);window.truck.command('panel-tab',tab);});
function facts(){
 const label=document.querySelector('#activity-label');label.textContent=state.activity?.label??'Стоит · открыто управление';label.dataset.code=state.activity?.code??'controls';
 document.querySelector('#fact-route').textContent=({roam:'Стол и окна',desktop:'Рабочий стол',windows:'По окнам'})[state.mode]??'Стол и окна';
 document.querySelector('#fact-doors').textContent=state.doorLeft&&state.doorRight?'Обе открыты':state.doorLeft?'Левая открыта':state.doorRight?'Правая открыта':'Закрыты';
 document.querySelector('#fact-windows').textContent=state.windowLeft&&state.windowRight?'Оба опущены':state.windowLeft?'Левое опущено':state.windowRight?'Правое опущено':'Подняты';
 document.querySelector('#fact-hood').textContent=state.hood?'Открыт':'Закрыт';document.querySelector('#fact-lights').textContent=state.lights?'Включены':'Выключены';
}
const wheelNames=['Переднее левое','Переднее правое','Заднее 1 · левое внутреннее','Заднее 1 · левое наружное','Заднее 1 · правое внутреннее','Заднее 1 · правое наружное','Заднее 2 · левое внутреннее','Заднее 2 · левое наружное','Заднее 2 · правое внутреннее','Заднее 2 · правое наружное'];
const wheelSelect=document.querySelector('#wheel-select');
wheelNames.forEach((name,i)=>{const option=document.createElement('option');option.value=String(i);option.textContent=name;wheelSelect.append(option);});
function health(){
 if(state.service?.type==='wheel')wheelSelect.value=String(state.service.wheel);
 const m=state.maintenance??{oil:100,engine:100,odometerKm:0,tires:Array(10).fill(100)};
 for(const k of ['oil','engine']){document.querySelector(`#${k}-value`).textContent=`${Math.round(m[k])}%`;document.querySelector(`#${k}-meter`).value=m[k];}
 document.querySelector('#odometer').textContent=`${m.odometerKm.toLocaleString('ru-RU',{maximumFractionDigits:1,minimumFractionDigits:1})} км`;
 document.querySelector('#tire-value').textContent=`${Math.round(m.tires[Number(wheelSelect.value)]??100)}%`;
 document.querySelector('#clean-value').textContent=`${Math.round(m.cleanliness??100)}%`;document.querySelector('#clean-meter').value=m.cleanliness??100;
 const job=state.service,progress=document.querySelector('#service-progress'),label=document.querySelector('#service-status');
 document.querySelector('[data-command=wash]').disabled=!!job;progress.hidden=!job;progress.value=job?.progress??0;
 document.querySelector('#replace-wheel').disabled=!!job;document.querySelector('[data-command="service"]').disabled=!!job;wheelSelect.disabled=!!job;
 const critical=m.oil<=2||m.engine<=5||m.tires.some(v=>v<=5),low=m.oil<20||m.engine<20||m.tires.some(v=>v<20);
 label.classList.toggle('urgent',critical||low);
 label.textContent=job?`${job.type==='wheel'?'Замена колеса':job.type==='wash'?'Мойка':'Обслуживание двигателя'} · ${Math.round(job.progress*100)}%`:critical?'Поездка остановлена: требуется ТО или замена изношенного колеса.':low?'Есть изношенные узлы. Запланируйте обслуживание.':(m.cleanliness??100)<21?'Грузовик грязный. Пора на мойку.':'Все узлы исправны.';
}
const horn=new HornPlayer();window.truck.onHorn(()=>horn.play().catch(()=>{document.querySelector('#notice,#error').textContent='Не удалось воспроизвести сигнал. Проверьте звук приложения.';}));
window.truck.onState(data=>{horn.setVolume(data.hornVolume);
 state=data;truck.state=data;if(['controls','state'].includes(data.panelTab))selectTab(data.panelTab);facts();
 for(const button of document.querySelectorAll('[data-toggle]')){const active=!!data[button.dataset.toggle];button.setAttribute('aria-pressed',String(active));}
 for(const name of ['speed','size','mode','hornVolume']){const input=document.querySelector(`[name="${name}"]`);if(document.activeElement!==input)input.value=data[name];}
 document.querySelector('#speed-value').textContent=`${data.speed} px/с`;
 document.querySelector('#size-value').textContent=`${data.size} px`;
 document.querySelector('#pause-label').textContent=data.paused?'Продолжить поездку':'Пауза';
 document.querySelector('#volume-value').textContent=`${data.hornVolume??60}%`;health();
 status.textContent=data.nativeReady?'Окна подключены':'Езда по рабочему столу';
});
window.truck.onError(message=>{document.querySelector('#notice').textContent=message;});
for(const button of document.querySelectorAll('[data-toggle]'))button.addEventListener('click',()=>window.truck.command(button.dataset.toggle,!state[button.dataset.toggle]));
for(const button of document.querySelectorAll('[data-command]'))button.addEventListener('click',()=>window.truck.command(button.dataset.command));
wheelSelect.addEventListener('change',health);document.querySelector('#replace-wheel').addEventListener('click',()=>window.truck.command('replace-wheel',Number(wheelSelect.value)));
for(const input of document.querySelectorAll('input,select:not([name=wheel])'))input.addEventListener('input',()=>window.truck.command(input.name,input.type==='range'?Number(input.value):input.value));
for(const button of document.querySelectorAll('[data-direction]'))button.addEventListener('click',()=>window.truck.command('direction',Number(button.dataset.direction)));
function animate(now){truck.update(Math.min(.08,(now-last)/1000));last=now;requestAnimationFrame(animate);}
truck.load().then(()=>{window.truck.ready();requestAnimationFrame(animate);}).catch(e=>{document.querySelector('#notice').textContent=e.message;console.error(e);});

if(globalThis.__TRUCK_TEST__)globalThis.__truckScene=truck;

if(globalThis.__TRUCK_TEST__)globalThis.__hornPlayer=horn;
