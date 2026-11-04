const {test,expect}=require('@playwright/test');
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{
  window.__TRUCK_TEST__=true;const listeners=[];let pointer;window.__commands=[];
  const state={paused:false,mode:'roam',speed:65,size:360,doorLeft:false,doorRight:false,windowLeft:false,windowRight:false,hood:false,lights:true,autostart:false,nativeReady:true,platform:'win32'};
  window.truck={onState:fn=>listeners.push(fn),onMotion:()=>{},onPointer:fn=>pointer=fn,onError:()=>{},metrics:v=>window.__metrics=v,hover:v=>window.__hover=v,drag:()=>{},ready:()=>{for(const fn of listeners)fn({...state});},command:(type,value)=>{window.__commands.push({type,value});if(Object.hasOwn(state,type))state[type]=value;if(type==='close-all')for(const k of ['doorLeft','doorRight','windowLeft','windowRight','hood'])state[k]=false;for(const fn of listeners)fn({...state});}};
  window.__pointer=p=>pointer?.(p);
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
 const metrics=await page.evaluate(()=>window.__metrics);expect(metrics.foot).toBeGreaterThan(175);expect(metrics.foot).toBeLessThanOrEqual(252);
 await page.locator('canvas').dblclick({position:{x:180,y:126}});expect(await page.evaluate(()=>window.__commands.some(c=>c.type==='panel'))).toBe(true);
 await page.screenshot({path:'test-results/desktop-truck.png',omitBackground:true});
});
