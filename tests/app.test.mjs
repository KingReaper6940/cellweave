import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {mount} from '../src/app.mjs';
import {tsv as parseTsv} from '../src/import.mjs';
import {project} from '../src/handoff.mjs';
const source=await readFile(new URL('../index.html',import.meta.url),'utf8');
function fixture(options={}){
 const dom=new JSDOM(source,{url:'https://example.invalid'}),doc=dom.window.document,objects=new Map(),revoked=[];let id=0,clipboard='';
 const app=mount(doc,{URL:{createObjectURL(blob){const url='blob:test-'+(++id);objects.set(url,blob);return url;},revokeObjectURL(url){revoked.push(url);objects.delete(url);}},clipboard:options.clipboard??{async writeText(s){clipboard=s;}}});
 const $=s=>doc.getElementById(s),event=(node,type)=>node.dispatchEvent(new dom.window.Event(type,{bubbles:true}));
 const select=(id,value)=>{$(id).value=value;event($(id),'change');};
 const paste=(text,format='tsv')=>{select('input-format',format);$('source').value=text;event($('source'),'input');$('import').click();};
 return {dom,doc,app,$,event,select,paste,objects,revoked,get clipboard(){return clipboard;},close(){app.dispose();dom.window.close();}};
}
test('actual app handlers in simulated DOM (not native browser QA)',async t=>{
 await t.test('imports, edits inert cell text and keeps focused editor attached',()=>{
 const f=fixture();try{
 f.paste('Header\tOther\n<script>alert(1)</script>\t123');const input=f.doc.querySelector('input[data-row="1"][data-col="0"]');input.focus();input.value='**changed**';
 f.event(input,'input');f.event(input,'change');
 assert.equal(f.app.history.current.cells[1][0],'**changed**');assert.ok(input.isConnected);assert.equal(f.doc.activeElement,input);assert.equal(f.doc.querySelectorAll('#grid script').length,0);
 f.$('undo').click();assert.equal(f.app.history.current.cells[1][0],'<script>alert(1)</script>');
 f.$('redo').click();assert.equal(f.app.history.current.cells[1][0],'**changed**');
 }finally{f.close();}});
 await t.test('invalid imports preserve data, export and previous history',()=>{
 const f=fixture();try{const before=JSON.stringify(f.app.history.current),out=f.$('output').value;f.paste('a\tb\nx');assert.equal(JSON.stringify(f.app.history.current),before);assert.equal(f.$('output').value,out);assert.ok(f.$('status').classList.contains('error'));}finally{f.close();}});
 await t.test('all rows export despite pagination; deleting and adding rows refresh counts',()=>{
 const f=fixture();try{f.paste(['Header',...Array.from({length:40},(_,i)=>'Item'+i)].join('\n'));assert.equal(f.doc.querySelectorAll('#grid tbody tr').length,12);f.$('next').click();assert.match(f.$('page-label').textContent,/13–24/);f.select('output-format','tsv');assert.equal(parseTsv(f.$('output').value).cells.length,41);
 f.$('add-row').click();assert.equal(f.app.history.current.cells.length,42);f.select('row-select','41');f.$('delete-row').click();assert.equal(f.app.history.current.cells.length,41);
 }finally{f.close();}});
 await t.test('column move preserves labels/alignment and transpose handles full matrix',()=>{
 const f=fixture();try{f.paste('A\tB\nx\ty');f.select('align','right');f.$('col-right').click();assert.deepEqual(f.app.history.current.align,['none','right']);assert.equal(f.app.history.current.cells[0][1],'A');f.$('transpose').click();assert.deepEqual(f.app.history.current.cells,[['B','y'],['A','x']]);assert.deepEqual(f.app.history.current.align,['none','none']);}finally{f.close();}});
 await t.test('default TSV guard changes only handoff text; exact JSON and blobs stay current',async()=>{
 const f=fixture();try{f.paste('Name\n=1+1');const old=f.$('download').getAttribute('href');f.select('output-format','tsv');assert.ok(f.revoked.includes(old));assert.match(f.$('output').value,/'=1\+1/);assert.match(f.$('export-note').textContent,/1 formula/);
 f.$('guard').checked=false;f.event(f.$('guard'),'change');assert.equal(parseTsv(f.$('output').value).cells[1][0],'=1+1');
 const saved=await f.objects.get(f.$('save-project').getAttribute('href')).text();assert.deepEqual(project(saved),f.app.history.current);
 f.$('copy').click();await Promise.resolve();assert.equal(f.clipboard,f.$('output').value);
 const url=f.$('download').getAttribute('href');assert.ok(f.objects.has(url),JSON.stringify({url,keys:[...f.objects.keys()],revoked:f.revoked}));assert.equal(await f.objects.get(url).text(),f.$('output').value);
 }finally{f.close();}});
 await t.test('clipboard failure offers manual copy without losing output',async()=>{
 const f=fixture({clipboard:{async writeText(){throw Error('denied');}}});try{const before=f.$('output').value;
 f.$('copy').click();await new Promise(r=>setTimeout(r,0));assert.match(f.$('status').textContent,/Clipboard unavailable/);assert.equal(f.$('output').value,before);
 }finally{f.close();}});
 await t.test('invalid cell change restores last valid value without breaking grid',()=>{
 const f=fixture();try{const input=f.doc.querySelector('input[data-row="1"]'),old=input.value;input.value='x'.repeat(1001);f.event(input,'change');assert.equal(input.value,old);assert.ok(f.$('status').classList.contains('error'));}finally{f.close();}});
 await t.test('project file restores exact values and malformed UTF-8 preserves current table',async()=>{
 const f=fixture();try{const bytes=new TextEncoder().encode(JSON.stringify({schema:'cellweave-table-v1',cells:[['new'],['=1']],align:['center']}));const input=f.$('file');Object.defineProperty(input,'files',{configurable:true,value:[{name:'table.json',size:bytes.length,arrayBuffer:async()=>bytes.buffer}]});f.event(input,'change');await new Promise(r=>setTimeout(r,0));assert.equal(f.app.history.current.cells[1][0],'=1');assert.equal(f.app.history.current.align[0],'center');
 const before=JSON.stringify(f.app.history.current);Object.defineProperty(input,'files',{configurable:true,value:[{name:'bad.tsv',size:1,arrayBuffer:async()=>Uint8Array.of(0xff).buffer}]});f.event(input,'change');await new Promise(r=>setTimeout(r,0));assert.equal(JSON.stringify(f.app.history.current),before);assert.match(f.$('status').textContent,/File not opened/);
 }finally{f.close();}});
 await t.test('late file reads cannot overwrite an in-progress cell edit or newer file',async()=>{
 const f=fixture();try{
 let release;const pending=new Promise(r=>release=r),input=f.$('file');const bytes=new TextEncoder().encode('old\nfile');
 f.select('input-format','tsv');Object.defineProperty(input,'files',{configurable:true,value:[{name:'old.tsv',size:bytes.length,arrayBuffer:()=>pending}]});f.event(input,'change');
 const cell=f.doc.querySelector('input[data-row="1"]');cell.value='newer draft';f.event(cell,'input');release(bytes.buffer);await new Promise(r=>setTimeout(r,0));
 assert.equal(cell.value,'newer draft');assert.match(f.$('status').textContent,/not applied/);f.event(cell,'change');assert.equal(f.app.history.current.cells[1][0],'newer draft');
 let resolveFirst;Object.defineProperty(input,'files',{configurable:true,value:[{name:'one.tsv',size:bytes.length,arrayBuffer:()=>new Promise(r=>resolveFirst=r)}]});f.event(input,'change');
 const later=new TextEncoder().encode('newest\nsecond');Object.defineProperty(input,'files',{configurable:true,value:[{name:'two.tsv',size:later.length,arrayBuffer:async()=>later.buffer}]});f.event(input,'change');await new Promise(r=>setTimeout(r,0));resolveFirst(bytes.buffer);await new Promise(r=>setTimeout(r,0));assert.equal(f.app.history.current.cells[0][0],'newest');
 }finally{f.close();}});
 await t.test('exported HTML parses as literal table text, with no active elements',()=>{
 const f=fixture();try{f.paste('H\n<img src=x onerror=bad()>');f.select('output-format','html');const dom=new JSDOM(f.$('output').value);assert.equal(dom.window.document.querySelector('td').textContent,'<img src=x onerror=bad()>');assert.equal(dom.window.document.querySelectorAll('script,img,a').length,0);dom.window.close();}finally{f.close();}});
});
