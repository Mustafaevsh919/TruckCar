'use strict';
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function subtractInterval(parts, left, right) {
  return parts.flatMap(([a,b]) => right <= a || left >= b ? [[a,b]] :
    [[a, Math.min(b,left)], [Math.max(a,right), b]].filter(([x,y]) => y > x));
}

// Native windows arrive from front to back. Only expose visible pieces of a title edge.
function platforms(displays, windows, footprint = 220, mode = 'roam', headroom = 35) {
  const result = [];
  for (const display of displays) {
    const a = display.workArea;
    result.push({id:`desktop:${display.id}`, kind:'desktop', x:a.x, y:a.y+a.height,
      width:a.width, displayId:display.id});
    if (mode === 'desktop') continue;
    windows.forEach((w,index) => {
      if (w.y < a.y + headroom || w.y > a.y + a.height - 20) return;
      let segments = [[Math.max(a.x,w.x),Math.min(a.x+a.width,w.x+w.width)]];
      if (segments[0][1] <= segments[0][0]) return;
      for (const front of windows.slice(0,index)) {
        if (front.y <= w.y && front.y+front.height > w.y)
          segments = subtractInterval(segments,front.x,front.x+front.width);
      }
      segments.forEach(([left,right],i) => {
        if (right-left >= footprint+12) result.push({id:`window:${w.id}:${display.id}:${i}`,
          kind:'window', x:left, y:w.y, width:right-left, displayId:display.id});
      });
    });
  }
  return result;
}

class DesktopMotion {
  constructor() { this.x=400; this.y=600; this.direction=1; this.rail=null; this.transition=null; }
  moveTo(rail,footprint,animate=true) {
    const half=Math.min(footprint/2+5,rail.width/2);
    const x=clamp(this.x,rail.x+half,rail.x+rail.width-half);
    this.transition=animate?{fromX:this.x,fromY:this.y,toX:x,toY:rail.y,t:0}:null;
    if (!animate) { this.x=x; this.y=rail.y; }
    this.rail={...rail};
  }
  attach(rails,footprint) {
    const below=rails.filter(r => this.x>=r.x && this.x<=r.x+r.width && r.y>=this.y-28)
      .sort((a,b)=>a.y-b.y);
    const target=below[0] || rails.find(r=>r.kind==='desktop');
    if(target) this.moveTo(target,footprint,true);
  }
  tick(dt,rails,{footprint=220,speed=65,moving=true,freezeTransition=false}={}) {
    dt=clamp(dt,0,.1);
    if(this.transition) {
      if(freezeTransition)return {distance:0,direction:this.direction};
      const a=this.transition; a.t=Math.min(1,a.t+dt/0.9);
      const t=a.t*a.t*(3-2*a.t);
      this.x=a.fromX+(a.toX-a.fromX)*t;
      this.y=a.fromY+(a.toY-a.fromY)*t-Math.sin(a.t*Math.PI)*24;
      if(a.t===1)this.transition=null;
      return {distance:0,direction:this.direction};
    }
    let rail=this.rail&&rails.find(r=>r.id===this.rail.id);
    if(!rail){this.attach(rails,footprint);return {distance:0,direction:this.direction};}
    this.x+=rail.x-this.rail.x;
    this.y=rail.y;this.rail={...rail};
    const half=Math.min(footprint/2+5,rail.width/2),left=rail.x+half,right=rail.x+rail.width-half;
    const before=this.x;
    if(moving)this.x+=this.direction*speed*dt;
    if(this.x>=right){this.x=right;this.direction=-1;}
    if(this.x<=left){this.x=left;this.direction=1;}
    this.x=clamp(this.x,left,right);
    return {distance:Math.abs(this.x-before),direction:this.direction};
  }
}
module.exports={clamp,subtractInterval,platforms,DesktopMotion};
