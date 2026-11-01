import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||5218);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.ttf':'font/ttf','.glb':'model/gltf-binary','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8','.pdf':'application/pdf'};
http.createServer(async(request,response)=>{
  try{
    const address=new URL(request.url,'http://localhost');
    let file=path.resolve(root,'.'+decodeURIComponent(address.pathname));
    if(file!==root&&!file.startsWith(root+path.sep)){response.writeHead(403);response.end();return;}
    if((await stat(file)).isDirectory())file=path.join(file,'index.html');
    const info=await stat(file);
    response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':info.size});
    if(request.method==='HEAD')response.end();else createReadStream(file).pipe(response);
  }catch{response.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});response.end('这里还没有宝藏。回到首页再逛逛吧。');}
}).listen(port,'127.0.0.1',()=>console.log(`Asia的宝藏盒：http://127.0.0.1:${port}/\n保持此窗口开启；按 Ctrl+C 停止。`));
