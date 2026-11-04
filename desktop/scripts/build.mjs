import {build} from 'esbuild';
import {mkdir,stat} from 'node:fs/promises';
await stat(new URL('../app/assets/truck.glb.gz',import.meta.url));
await mkdir(new URL('../app/runtime/',import.meta.url),{recursive:true});
await build({entryPoints:['src/renderer.mjs','src/panel.mjs'],bundle:true,outdir:'app/runtime',outExtension:{'.js':'.js'},format:'esm',target:'chrome132',sourcemap:false,minify:true,legalComments:'eof'});
