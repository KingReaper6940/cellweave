import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {dirname,resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../dist');
const allowed=new Set(["/index.html","/style.css","/favicon.svg","/src/model.mjs","/src/import.mjs","/src/edit.mjs","/src/export.mjs","/src/example.mjs","/src/app.mjs","/src/handoff.mjs"]);
const mime={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{try{
 let path=new URL(req.url,'http://127.0.0.1').pathname;if(path==='/')path='/index.html';
 if(!['GET','HEAD'].includes(req.method)||!allowed.has(path)){res.writeHead(404).end();return;}
 const data=await readFile(resolve(root,'.'+path));
 res.writeHead(200,{'Content-Type':mime[extname(path)]+';charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 res.end(req.method==='HEAD'?undefined:data);
}catch{res.writeHead(404).end();}}).listen(4193,'127.0.0.1',()=>console.log('Cellweave: http://127.0.0.1:4193'));
