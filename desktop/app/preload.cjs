const {contextBridge,ipcRenderer}=require('electron');
const listen=(channel,fn)=>{const cb=(_,data)=>fn(data);ipcRenderer.on(channel,cb);return()=>ipcRenderer.removeListener(channel,cb);};
contextBridge.exposeInMainWorld('truck',{
  command:(type,value)=>ipcRenderer.send('command',{type,value}),
  ready:()=>ipcRenderer.send('ready'),
  metrics:(data)=>ipcRenderer.send('metrics',data),
  hover:(value)=>ipcRenderer.send('hover',Boolean(value)),
  drag:(value)=>ipcRenderer.send('drag',Boolean(value)),
  onState:(fn)=>listen('state',fn), onMotion:(fn)=>listen('motion',fn),
  onPointer:(fn)=>listen('pointer',fn), onError:(fn)=>listen('status',fn)
});
