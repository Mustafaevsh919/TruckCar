const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{
  window.__TRUCK_TEST__=true;const listeners=[];let pointer,horn;window.__commands=[];
  const state={paused:false,mode:'roam',speed:65,size:360,doorLeft:false,doorRight:false,windowLeft:false,windowRight:false,hood:false,lights:true,autostart:false,hornVolume:60,maintenance:{odometerKm:12,oil:43,engine:88,tires:Array(10).fill(60),cleanliness:100},service:null,nativeReady:true,platform:'win32'};
  window.truck={onHorn:fn=>horn=fn,onState:fn=>listeners.push(fn),onMotion:()=>{},onPointer:fn=>pointer=fn,onError:()=>{},metrics:v=>window.__metrics=v,hover:v=>window.__hover=v,drag:()=>{},ready:()=>{for(const fn of listeners)fn({...state});},command:(type,value)=>{window.__commands.push({type,value});if(type==='horn')horn?.();if(type==='replace-wheel')state.service={type:'wheel',wheel:Number(value),progress:.35};if(type==='service')state.service={type:'engine',progress:.35};if(type==='wash')state.service={type:'wash',progress:.35};if(Object.hasOwn(state,type))state[type]=value;if(type==='close-all')for(const k of ['doorLeft','doorRight','windowLeft','windowRight','hood'])state[k]=false;for(const fn of listeners)fn({...state});}};
  window.__pointer=p=>pointer?.(p);window.__finishService=()=>{const j=state.service;if(j?.type==='wheel')state.maintenance.tires[j.wheel]=100;if(j?.type==='wash')state.maintenance.cleanliness=100;state.service=null;for(const fn of listeners)fn({...state});};
 });
});
test('the actual model renders and panel controls animate its rig',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/panel.html');
 await page.waitForFunction(()=>window.__truckScene?.rig);await expect(page.locator('#status')).toHaveText('Окна подключены');
 await page.getByRole('button',{name:'Левая дверь',exact:true}).click();
 await page.getByRole('button',{name:'Левое стекло',exact:true}).click();
 await page.getByRole('button',{name:'Капот и двигатель',exact:true}).click();await page.waitForFunction(()=>window.__truckScene.rig.values.hood>.98&&window.__truckScene.rig.values.windowLeft>.98&&window.__truckScene.rig.values.doorLeft>.98);
 const pose=await page.evaluate(()=>({door:window.__truckScene.rig.values.doorLeft,glass:window.__truckScene.rig.values.windowLeft,hood:window.__truckScene.rig.values.hood}));
 expect(pose.door).toBeGreaterThan(.9);expect(pose.glass).toBeGreaterThan(.9);expect(pose.hood).toBeGreaterThan(.9);
 await page.screenshot({path:'test-results/garage-open.png'});
 await page.getByRole('button',{name:'Закрыть всё',exact:true}).click();
 await page.waitForFunction(()=>window.__truckScene.rig.values.hood<.02);expect(await page.evaluate(()=>window.__truckScene.rig.values.hood)).toBeLessThan(.05);
 expect(errors).toEqual([]);
});
test('overlay has transparent click-through corners and opens the garage on double click',async({page})=>{
 await page.setViewportSize({width:360,height:252});await page.goto('/index.html');await page.waitForFunction(()=>window.__truckScene?.rig);await page.waitForTimeout(500);
 expect(await page.evaluate(()=>window.__truckScene.hit(0,0))).toBeNull();
 const metrics=await page.evaluate(()=>window.__metrics);expect(metrics.foot).toBeGreaterThan(175);expect(await page.evaluate(()=>Math.abs(window.__truckScene.camera.position.x))).toBeLessThan(.001);expect(metrics.foot).toBeLessThanOrEqual(252);
 await page.locator('canvas').click({position:{x:180,y:126}});await page.waitForFunction(()=>window.__commands.some(c=>c.type==='horn'));
 const horns=await page.evaluate(()=>window.__commands.filter(c=>c.type==='horn').length);
 await page.mouse.move(180,126);await page.mouse.down();await page.mouse.move(215,138,{steps:5});await page.mouse.up();await page.waitForTimeout(650);
 expect(await page.evaluate(()=>window.__commands.filter(c=>c.type==='horn').length)).toBe(horns);
 await page.locator('canvas').dblclick({position:{x:180,y:126}});await page.waitForTimeout(650);
 expect(await page.evaluate(()=>window.__commands.filter(c=>c.type==='horn').length)).toBe(horns);expect(await page.evaluate(()=>window.__commands.some(c=>c.type==='panel'))).toBe(true);
 await page.evaluate(()=>window.__truckScene.motion({direction:-1,distance:0}));
 await page.waitForFunction(()=>Math.abs(window.__truckScene.vehicle.rotation.y-Math.PI)<.01);
 expect(await page.evaluate(()=>window.__truckScene.camera.position.x)).toBe(0);
 await page.screenshot({path:'test-results/desktop-truck.png',omitBackground:true});
});

test('service controls start a visible wheel job and the actual horn audio plays',async({page})=>{
 await page.goto('/panel.html');await page.waitForFunction(()=>window.__truckScene?.rig);
 await expect(page.locator('#oil-value')).toHaveText('43%');
 await page.evaluate(()=>{window.__hornPlayer.audio.addEventListener('playing',()=>window.__hornPlayed=true);});
 await page.getByRole('button',{name:'Посигналить',exact:false}).click();await page.waitForFunction(()=>window.__hornPlayed===true);
 expect(await page.evaluate(()=>window.__hornPlayer.audio.volume)).toBeCloseTo(.6);
 await page.locator('#wheel-select').selectOption('0');await page.getByRole('button',{name:'Заменить колесо',exact:true}).click();
 await expect(page.locator('#service-status')).toContainText('Замена колеса');await expect(page.locator('#replace-wheel')).toBeDisabled();
 expect(await page.evaluate(()=>window.__truckScene.state.service.wheel)).toBe(0);
 await page.screenshot({path:'test-results/service.png',fullPage:true});
 await page.evaluate(()=>window.__finishService());await page.getByRole('button',{name:'Помыть',exact:true}).click();await expect(page.locator('#service-status')).toContainText('Мойка');
 await page.waitForFunction(()=>window.__truckScene.water.visible===true);
 await page.evaluate(()=>window.__finishService());await expect(page.locator('#clean-value')).toHaveText('100%');
});

test('one-hour dirt visibly changes the actual model and washing removes it',async({page})=>{
 const shaderErrors=[];page.on('console',m=>{if(m.type()==='error'&&/THREE|Shader|GL_INVALID/.test(m.text()))shaderErrors.push(m.text());});
 await page.setViewportSize({width:360,height:252});await page.goto('/index.html');await page.waitForFunction(()=>window.__truckScene?.rig);await page.waitForTimeout(500);
 const clean=await page.screenshot({omitBackground:true});
 await page.evaluate(()=>window.__truckScene.state.maintenance.cleanliness=0);await page.waitForFunction(()=>window.__truckScene.dirt.amount.value>.99);
 const dirty=await page.screenshot({path:'test-results/dirty-truck.png',omitBackground:true});expect(dirty.equals(clean)).toBe(false);
 await page.evaluate(()=>window.truck.command('wash'));await page.waitForFunction(()=>window.__truckScene.water.visible);
 await page.evaluate(()=>window.__finishService());await page.waitForFunction(()=>window.__truckScene.dirt.amount.value<.001);
 expect(shaderErrors).toEqual([]);
});
