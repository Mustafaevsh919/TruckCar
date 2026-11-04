const test=require('node:test'),assert=require('node:assert/strict');
const {subtractInterval,platforms,DesktopMotion}=require('../app/motion.cjs');
const display={id:1,workArea:{x:0,y:0,width:1920,height:1040}};
test('front windows cut hidden pieces out of lower window edges',()=>{
 const rails=platforms([display],[{id:'front',x:700,y:400,width:500,height:400},{id:'back',x:100,y:500,width:1200,height:400}],220);
 const back=rails.filter(r=>r.id.startsWith('window:back:'));
 assert.equal(back.length,1);assert.equal(back[0].x,100);assert.equal(back[0].width,600);
});
test('fully covered and too narrow windows are not routes',()=>{
 const rails=platforms([display],[{id:'front',x:0,y:40,width:1920,height:1000},{id:'back',x:100,y:200,width:600,height:400},{id:'tiny',x:100,y:90,width:120,height:80}],220);
 assert(!rails.some(r=>r.id.startsWith('window:back:')));assert(!rails.some(r=>r.id.startsWith('window:tiny:')));
});
test('negative monitor coordinates preserve desktop and window positions',()=>{
 const d={id:2,workArea:{x:-1920,y:-100,width:1920,height:1080}};
 const rails=platforms([d],[{id:'a',x:-1500,y:200,width:900,height:600}]);
 assert.equal(rails[0].x,-1920);assert.equal(rails[0].y,980);assert.equal(rails[1].x,-1500);
});
test('desktop mode does not enumerate window routes',()=>assert.equal(platforms([display],[{id:'a',x:100,y:300,width:900,height:600}],220,'desktop').length,1));
test('interval clipping handles overlaps, complete removal and off-edge masks',()=>{
 assert.deepEqual(subtractInterval([[0,100]],30,50),[[0,30],[50,100]]);
 assert.deepEqual(subtractInterval([[0,100]],-20,120),[]);
 assert.deepEqual(subtractInterval([[0,100]],101,120),[[0,100]]);
});
test('truck reverses without going over a window edge',()=>{
 const m=new DesktopMotion(),rail={id:'w',kind:'window',x:0,y:400,width:500};m.x=443;m.moveTo(rail,100,false);
 m.tick(.1,[rail],{footprint:100,speed:100,moving:true});assert.equal(m.x,445);assert.equal(m.direction,-1);
});
test('a moving window carries the truck, including while paused',()=>{
 const m=new DesktopMotion(),a={id:'w',kind:'window',x:0,y:500,width:600};m.x=200;m.moveTo(a,100,false);
 m.tick(.1,[{...a,x:100,y:300}],{footprint:100,moving:false});assert.equal(m.x,300);assert.equal(m.y,300);
});
test('closing a support window falls back to a lower route',()=>{
 const m=new DesktopMotion();m.x=400;m.y=300;m.rail={id:'closed',x:0,y:300,width:800};const floor={id:'floor',kind:'desktop',x:0,y:1000,width:1920};
 m.tick(.1,[floor],{footprint:200});assert.equal(m.rail.id,'floor');
 for(let i=0;i<20;i++)m.tick(.1,[floor],{footprint:200,moving:false});assert.equal(m.y,1000);
});

test('window routes leave enough room above the cab',()=>{const rails=platforms([display],[{id:'near-top',x:100,y:80,width:900,height:500}],220,'roam',180);assert.equal(rails.length,1);});
