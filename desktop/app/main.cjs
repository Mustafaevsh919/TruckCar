'use strict';
const {app,BrowserWindow,screen,ipcMain,Menu,Tray,nativeImage,protocol,net,globalShortcut}=require('electron');
const {spawn}=require('node:child_process');
const path=require('node:path'),fs=require('node:fs');
const {gunzipSync}=require('node:zlib');
let modelBytes=null;
const {pathToFileURL}=require('node:url');
const {clamp,platforms,DesktopMotion}=require('./motion.cjs');
const {Maintenance}=require('./maintenance.cjs');
const {activity}=require('./activity.cjs');
let panelTab='controls';
function currentActivity(){return activity(state,{service:maintenance.progress(),dragging:!!dragging,critical:maintenance.needsStop(),panelOpen:!!panel?.isVisible(),hovered:!ignoring,turning:performance.now()<turnUntil,transition:!!motion.transition,direction:motion.direction});}
let maintenance=new Maintenance(),serviceHood=false,lastHealth=0,lastHealthSave=0,lastHorn=0,turnUntil=0,lastDirection=1;
protocol.registerSchemesAsPrivileged([{scheme:'truck',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);
if(!app.requestSingleInstanceLock())app.quit();
app.on('second-instance',()=>panel?.show());
let pet,panel,tray,tracker,ticker,pointerTimer,dragging=null,quitting=false,ignoring=true;
let rawWindows=[],windowEdges=[],nativeReady=false,frame={width:360,height:252,foot:222,footprint:240};
let last=performance.now(),lastTrip=performance.now(),saveTimer=null;
const motion=new DesktopMotion();
const defaults={paused:false,mode:'roam',speed:65,size:360,doorLeft:false,doorRight:false,
 windowLeft:false,windowRight:false,hood:false,lights:true,autostart:false,hornVolume:60};
let state={...defaults};
const configPath=()=>path.join(app.getPath('userData'),'settings.json');
function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{fs.writeFileSync(configPath(),JSON.stringify({...state,maintenance:maintenance.snapshot()},null,2));}catch(e){console.error(e.message);}},300);}
function send(win,channel,value){if(win&&!win.isDestroyed())win.webContents.send(channel,value);}
function broadcast(){for(const win of [pet,panel])send(win,'state',{...state,maintenance:maintenance.snapshot(),service:maintenance.progress(),activity:currentActivity(),panelTab,nativeReady,platform:process.platform});}
function stopped(){return performance.now()<turnUntil||!!maintenance.job||maintenance.needsStop()||state.paused||!ignoring||!!dragging||!!panel?.isVisible()||state.hood||state.doorLeft||state.doorRight;}
function allRails(){return platforms(screen.getAllDisplays(),state.mode==='desktop'?[]:windowEdges,frame.footprint,state.mode,Math.max(35,frame.foot-28));}
function place(){if(!pet||pet.isDestroyed())return;pet.setPosition(Math.round(motion.x-frame.width/2),Math.round(motion.y-frame.foot),false);}
function ignore(value){if(!pet||pet.isDestroyed()||ignoring===value)return;ignoring=value;pet.setIgnoreMouseEvents(value,{forward:true});broadcast();}
function nearestFloor(){const p=screen.getCursorScreenPoint();const d=screen.getDisplayNearestPoint(p);return allRails().find(r=>r.id===`desktop:${d.id}`)||allRails()[0];}
function chooseWindow(){const rails=allRails().filter(r=>r.kind==='window');const r=rails[0];if(r)motion.moveTo(r,frame.footprint,true);else{motion.moveTo(nearestFloor(),frame.footprint,true);send(panel,'status','Нет подходящего открытого окна. Пока едем по рабочему столу.');}}
function resize(){frame.width=state.size;frame.height=Math.round(state.size*.70);pet.setSize(frame.width,frame.height,false);place();}
function startTracker(){
 if(process.platform!=='win32')return;
 const file=path.join(__dirname,'native','windows.ps1').replace(`app.asar${path.sep}`,`app.asar.unpacked${path.sep}`);
 tracker=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',file,'-ExcludePid',String(process.pid)],{windowsHide:true,stdio:['ignore','pipe','pipe']});
 let pending='';
 tracker.stdout.on('data',chunk=>{
  pending+=chunk.toString('utf8');let newline;
  while((newline=pending.indexOf('\n'))!==-1){const line=pending.slice(0,newline);pending=pending.slice(newline+1);
   try{const data=JSON.parse(line);if(!Array.isArray(data.windows))continue;rawWindows=data.windows;
    windowEdges=rawWindows.map(w=>{const rect=screen.screenToDipRect(null,{x:w.x,y:w.y,width:w.width,height:w.height});return {...rect,id:w.id};});
    if(!nativeReady){nativeReady=true;broadcast();if(state.mode==='windows')chooseWindow();}
   }catch(e){console.error('Window edge update:',e.message);}
  }
 });
 tracker.stderr.on('data',b=>console.error('Window tracker:',b.toString().trim()));
 tracker.on('error',()=>{nativeReady=false;broadcast();send(panel,'status','Не удалось получить границы окон. Езда по рабочему столу доступна.');});
 tracker.on('exit',()=>{nativeReady=false;windowEdges=[];broadcast();});
}
function showPanel(tab='controls'){
 panelTab=tab==='state'?'state':'controls';
 if(panel&&!panel.isDestroyed()){panel.show();panel.focus();broadcast();return;}
 const b=pet.getBounds(),area=screen.getDisplayMatching(b).workArea;
 panel=new BrowserWindow({width:430,height:Math.min(760,area.height),minWidth:380,minHeight:Math.min(620,area.height),alwaysOnTop:true,title:'Ваш Volvo',backgroundColor:'#111b24',
  x:clamp(b.x+b.width-430,area.x,area.x+area.width-430),y:clamp(b.y-510,area.y,Math.max(area.y,area.y+area.height-760)),
  autoHideMenuBar:true,show:false,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,autoplayPolicy:'no-user-gesture-required'}});
 panel.setMenu(null);panel.loadURL('truck://app/panel.html');
 panel.once('ready-to-show',()=>{panel.show();broadcast();});
 panel.on('close',e=>{if(!quitting){e.preventDefault();panel.hide();broadcast();}});
}
function menu(){return Menu.buildFromTemplate([
 {label:'Управление Volvo',click:()=>showPanel('controls')},
 {label:'Состояние грузовика',click:()=>showPanel('state')},
 {label:state.paused?'Продолжить поездку':'Остановиться',click:()=>command('paused',!state.paused)},
 {label:'На окно',click:()=>command('window')},{label:'На рабочий стол',click:()=>command('desktop')},
 {type:'separator'},
 {label:'Открыть / закрыть капот',click:()=>command('hood',!state.hood)},
 {label:'Закрыть всё',click:()=>command('close-all')},
 {label:'Посигналить · Ctrl+Alt+H',click:()=>command('horn')},
 {label:'Помыть грузовик',click:()=>command('wash')},
 {label:'ТО: масло и двигатель',click:()=>command('service')},
 {label:'Заменить видимое переднее колесо',click:()=>command('replace-wheel',motion.direction===1?0:1)},
 {label:'Состояние и другие колёса',click:()=>showPanel('state')},
 {type:'separator'},{label:'Выход',click:()=>app.quit()}
]);}
function updateTray(){if(tray)tray.setContextMenu(menu());}
function command(type,value){
 if(type==='panel-tab'){if(['controls','state'].includes(value)){panelTab=value;broadcast();}return;}
 if(type==='horn'){const now=performance.now();if(now-lastHorn<350)return;lastHorn=now;send(panel?.isVisible()?panel:pet,'horn',{});return;}
 if(type==='service'||type==='replace-wheel'||type==='wash'){
  if(!maintenance.begin(type==='service'?'engine':type==='wash'?'wash':'wheel',Number(value??0)))return;
  serviceHood=state.hood;if(type==='service')state.hood=true;
  dragging=null;motion.transition=null;broadcast();return;
 }
 if(maintenance.job&&['hood','close-all','direction'].includes(type))return;
 if(Object.hasOwn(defaults,type)){
  if(['speed','size','hornVolume'].includes(type)){if(!Number.isFinite(Number(value)))return;const ranges={speed:[20,180],size:[240,540],hornVolume:[0,100]};state[type]=clamp(Number(value),...ranges[type]);}
  else if(type==='mode'){if(!['desktop','windows','roam'].includes(value))return;state.mode=value;}
  else state[type]=Boolean(value);
  if(type==='size')resize();
  if(type==='mode'){if(value==='desktop')motion.moveTo(nearestFloor(),frame.footprint,true);if(value==='windows')chooseWindow();}
  if(type==='autostart'){
   if(app.isPackaged)app.setLoginItemSettings({openAtLogin:state.autostart,path:process.env.PORTABLE_EXECUTABLE_FILE||process.execPath});
   else{state.autostart=false;send(panel,'status','Автозапуск доступен в готовой сборке Windows.');}
  }
 }else if(type==='panel')showPanel();
 else if(type==='panel-close')panel?.hide();
 else if(type==='menu')menu().popup({window:pet});
 else if(type==='desktop'){state.mode='desktop';motion.moveTo(nearestFloor(),frame.footprint,true);}
 else if(type==='window'){state.mode='windows';chooseWindow();}
 else if(type==='direction'){motion.direction=value===-1?-1:1;state.paused=false;}
 else if(type==='close-all'){for(const k of ['hood','doorLeft','doorRight','windowLeft','windowRight'])state[k]=false;}
 else if(type==='quit'){app.quit();return;}
 else return;
 broadcast();updateTray();save();
}
app.whenReady().then(async()=>{
 try{const saved=JSON.parse(fs.readFileSync(configPath(),'utf8'));for(const [k,v]of Object.entries(saved)){if(Object.hasOwn(defaults,k)&&typeof v===typeof defaults[k])state[k]=v;
 if(k==='maintenance')maintenance=new Maintenance(v&&typeof v==='object'?v:{});}}catch{}
 state.hornVolume=clamp(state.hornVolume,0,100);state.speed=clamp(state.speed,20,180);state.size=clamp(state.size,240,540);if(!['desktop','windows','roam'].includes(state.mode))state.mode='roam';
 protocol.handle('truck',request=>{
  const url=new URL(request.url);if(url.hostname!=='app')return new Response('Not found',{status:404});
  let file;try{file=path.resolve(__dirname,'.'+decodeURIComponent(url.pathname));}catch{return new Response('Bad path',{status:400});}
  if(!file.startsWith(__dirname+path.sep))return new Response('Forbidden',{status:403});
  if(url.pathname==='/assets/truck.glb'){modelBytes??=gunzipSync(fs.readFileSync(path.join(__dirname,'assets','truck.glb.gz')));return new Response(modelBytes,{headers:{'Content-Type':'model/gltf-binary'}});}
  return net.fetch(pathToFileURL(file).toString());
 });
 pet=new BrowserWindow({width:state.size,height:Math.round(state.size*.70),transparent:true,frame:false,hasShadow:false,resizable:false,
  skipTaskbar:true,alwaysOnTop:true,focusable:false,backgroundColor:'#00000000',show:false,
  webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,autoplayPolicy:'no-user-gesture-required',backgroundThrottling:false,offscreen:process.env.TRUCK_SMOKE_TEST==='1'}});
 pet.setAlwaysOnTop(true,'floating');pet.setIgnoreMouseEvents(true,{forward:true});pet.webContents.setFrameRate(30);
 pet.webContents.setWindowOpenHandler(()=>({action:'deny'}));pet.webContents.on('will-navigate',e=>e.preventDefault());
 frame.width=state.size;frame.height=Math.round(state.size*.70);frame.foot=frame.height*.88;
 const floor=nearestFloor();motion.x=floor.x+floor.width*.55;motion.y=floor.y;motion.moveTo(floor,frame.footprint,false);place();
 pet.loadURL('truck://app/index.html');
 const icon=nativeImage.createFromPath(path.join(__dirname,'assets','tray.png'));
 if(!icon.isEmpty()){tray=new Tray(icon);tray.setToolTip('Volvo • на рабочем столе');tray.on('double-click',showPanel);updateTray();}
 ipcMain.on('ready',event=>{send(BrowserWindow.fromWebContents(event.sender),'state',{...state,maintenance:maintenance.snapshot(),service:maintenance.progress(),activity:currentActivity(),panelTab,nativeReady,platform:process.platform});if(event.sender===pet.webContents){pet.showInactive();if(process.env.TRUCK_SMOKE_TEST==='1')setTimeout(async()=>{try{const image=await pet.webContents.capturePage();if(!image.toBitmap().some((v,i)=>i%4===3&&v>0))throw new Error('Empty truck frame');fs.writeFileSync(process.env.TRUCK_SCREENSHOT||'truck-smoke.png',image.toPNG());console.log('TRUCK_SMOKE_OK');
 if(process.env.TRUCK_AUDIO_SMOKE==='1'){
  await pet.webContents.executeJavaScript(`new Promise((resolve,reject)=>{const audio=new Audio('truck://app/assets/horn.wav');audio.volume=0;audio.addEventListener('playing',()=>resolve(true),{once:true});audio.addEventListener('error',()=>reject(new Error('Horn audio failed')),{once:true});audio.play().catch(reject);setTimeout(()=>reject(new Error('Horn timeout')),8000);})`);
  console.log('AUDIO_SMOKE_OK');
 }
 app.quit();}catch(e){console.error(e);app.exit(1);}},1600);}});
 const trusted=event=>event.sender===pet?.webContents||event.sender===panel?.webContents;
 ipcMain.on('command',(event,data)=>{if(trusted(event)&&data&&typeof data.type==='string')command(data.type,data.value);});
 ipcMain.on('metrics',(event,data)=>{if(event.sender!==pet.webContents||!data)return;const foot=Number(data.foot),footprint=Number(data.footprint);if(Number.isFinite(foot)&&Number.isFinite(footprint)){frame.foot=clamp(foot,frame.height*.35,frame.height);frame.footprint=clamp(footprint,60,frame.width);place();}});
 ipcMain.on('hover',(event,hit)=>{if(event.sender===pet.webContents&&!dragging)ignore(!hit);});
 ipcMain.on('drag',(event,active)=>{
  if(event.sender!==pet.webContents)return;
  if(active){const p=screen.getCursorScreenPoint();dragging={x:p.x-motion.x,y:p.y-motion.y};motion.transition=null;ignore(false);}
  else if(dragging){dragging=null;motion.rail=null;motion.attach(allRails(),frame.footprint);ignore(true);}
 });
 startTracker();
 ticker=setInterval(()=>{
  const now=performance.now(),dt=(now-last)/1000;last=now;maintenance.age(dt);const complete=maintenance.tick(Math.min(dt,.25));if(complete){if(complete.type==='engine')state.hood=serviceHood;broadcast();save();send(panel,'status',complete.type==='wheel'?'Колесо заменено. Можно ехать.':complete.type==='wash'?'Мойка завершена: чистота 100%.':'ТО завершено: масло и двигатель восстановлены.');}let result={distance:0,direction:motion.direction};
  if(dragging){const p=screen.getCursorScreenPoint();motion.x=p.x-dragging.x;motion.y=p.y-dragging.y;}
  else {const rails=allRails();result=motion.tick(dt,rails,{footprint:frame.footprint,speed:state.speed,moving:!stopped(),freezeTransition:!ignoring});
   if(!stopped()&&state.mode==='roam'&&!motion.transition&&now-lastTrip>22000){const others=rails.filter(r=>r.id!==motion.rail?.id);if(others.length)motion.moveTo(others[Math.floor(Math.random()*others.length)],frame.footprint,true);lastTrip=now;}
  }
  if(result.direction!==lastDirection){turnUntil=now+850;lastDirection=result.direction;}
  if(!stopped())maintenance.drive(result.distance);
  if(now-lastHealth>(maintenance.job?100:1000)){broadcast();lastHealth=now;}
  if(now-lastHealthSave>15000){save();lastHealthSave=now;}
  place();send(pet,'motion',{...result,moving:!stopped(),speed:state.speed,burnout:currentActivity().burnout,activity:currentActivity()});
 },1000/30);
 pointerTimer=setInterval(()=>{if(dragging)return;const p=screen.getCursorScreenPoint(),b=pet.getBounds();const inside=p.x>=b.x&&p.y>=b.y&&p.x<b.x+b.width&&p.y<b.y+b.height;if(!inside)ignore(true);send(pet,'pointer',{x:p.x-b.x,y:p.y-b.y,inside});},50);
 globalShortcut.register('Control+Alt+T',showPanel);
 globalShortcut.register('Control+Alt+H',()=>command('horn'));
 screen.on('display-removed',()=>{motion.rail=null;motion.attach(allRails(),frame.footprint);});
 app.on('activate',showPanel);
 if(process.env.TRUCK_SMOKE_TEST==='1'){setTimeout(()=>{console.error('Truck startup timed out');app.exit(1);},60000).unref();}
});
app.on('before-quit',()=>{quitting=true;clearInterval(ticker);clearInterval(pointerTimer);clearTimeout(saveTimer);tracker?.kill();globalShortcut.unregisterAll();try{fs.writeFileSync(configPath(),JSON.stringify({...state,maintenance:maintenance.snapshot()},null,2));}catch{}});
app.on('window-all-closed',()=>app.quit());
