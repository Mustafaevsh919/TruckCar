const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {gunzipSync}=require('node:zlib');
const root=path.resolve(__dirname,'../app');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png'};
http.createServer((req,res)=>{try{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));if(!file.startsWith(root+path.sep))throw Error();res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');if(file===path.join(root,'assets','truck.glb')){res.end(gunzipSync(fs.readFileSync(file+'.gz')));return;}const stream=fs.createReadStream(file);stream.on('error',()=>{res.statusCode=404;res.end();});stream.pipe(res);}catch{res.statusCode=404;res.end();}}).listen(4321,'127.0.0.1');
