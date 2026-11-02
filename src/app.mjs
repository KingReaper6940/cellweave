import {markdown as parseMarkdown,tsv as parseTsv} from './import.mjs';
import {markdown,tsv,html,report} from './export.mjs';
import {History} from './edit.mjs';
import {sample} from './example.mjs';
export function mount(doc,env={}){
 const $=id=>doc.getElementById(id),history=new History(sample),urls=env.URL??globalThis.URL;
 let page=0,downloadUrl=null,revision=0;
 const say=(message,error=false)=>{$('status').textContent=message;$('status').classList.toggle('error',error);};
 function output(){
 const t=history.current,type=$('output-format').value,spread=tsv(t,$('guard').checked);
 $('output').value=type==='markdown'?markdown(t):type==='tsv'?spread.text:type==='html'?html(t):JSON.stringify(report(t),null,2)+'\n';
 $('export-note').textContent=type==='tsv'?(spread.guarded+' formula-like cells prefixed. Spreadsheet apps may still reinterpret text; keep JSON for exact values.'):type==='markdown'?'Literal output: punctuation and spaces use character references. This is not a rich Markdown preview.':type==='html'?'Escaped plain-text table. No scripts, styles, links or embedded content.':'Exact editable cell text and column alignment; history is not included.';
 $('guard').disabled=type!=='tsv';
 if(downloadUrl)urls.revokeObjectURL(downloadUrl);
 downloadUrl=urls.createObjectURL(new Blob([$('output').value],{type:type==='html'?'text/html':type==='json'?'application/json':'text/plain;charset=utf-8'}));
 $('download').href=downloadUrl;$('download').download='cellweave-table.'+({markdown:'md',tsv:'tsv',html:'html',json:'json'}[type]);
 }
 const option=(value,text)=>{const o=doc.createElement('option');o.value=value;o.textContent=text;return o;};
 function selectors(){
 const t=history.current;for(const [id,count,offset] of [['row-select',t.cells.length,1],['col-select',t.align.length,0]]){
 const old=$(id).value;$(id).replaceChildren();for(let i=offset;i<count;i++)$(id).append(option(i,id==='row-select'?'Row '+(i+1):'Column '+(i+1)));
 if([...$(id).options].some(o=>o.value===old))$(id).value=old;
 }
 $('align').value=t.align[Number($('col-select').value)];$('delete-row').disabled=t.cells.length===1;
 }
 function grid(){
 const t=history.current,size=12,count=t.cells.length-1;page=Math.min(page,Math.max(0,Math.ceil(count/size)-1));
 const table=$('grid');table.replaceChildren();const caption=doc.createElement('caption');caption.className='sr-only';caption.textContent='Editable plain-text cells. Row 1 is the header.';table.append(caption);
 const makeRow=(r,parent)=>{const tr=doc.createElement('tr'),label=doc.createElement('th');label.scope='row';label.textContent=r===0?'H':String(r+1);tr.append(label);
 t.cells[r].forEach((v,c)=>{const td=doc.createElement('td'),input=doc.createElement('input');input.value=v;input.maxLength=1000;input.dataset.row=r;input.dataset.col=c;input.setAttribute('aria-label',(r===0?'Header':'Row '+(r+1))+', column '+(c+1));td.append(input);tr.append(td);});parent.append(tr);};
 const head=doc.createElement('thead'),body=doc.createElement('tbody');makeRow(0,head);for(let r=1+page*size;r<Math.min(t.cells.length,1+(page+1)*size);r++)makeRow(r,body);table.append(head,body);
 $('dimensions').textContent=t.cells.length+' rows × '+t.align.length+' columns · header included';
 $('page-label').textContent=count?'Body rows '+(page*size+1)+'–'+Math.min(count,(page+1)*size)+' of '+count:'Header only';
 $('prev').disabled=page===0;$('next').disabled=(page+1)*size>=count;
 }
 function render(){grid();selectors();$('undo').disabled=!history.past.length;$('redo').disabled=!history.future.length;output();}
 function change(fn,message){try{const changed=fn();if(changed!==false)revision++;render();say(message);}catch(e){say(e.message,true);}}
 function apply(action,message='Table updated. Undo is available.'){change(()=>history.apply(action),message);}
 $('grid').addEventListener('change',e=>{if(!e.target.matches('input[data-row]'))return;const {row,col}=e.target.dataset;apply({type:'cell',row:Number(row),col:Number(col),value:e.target.value});});
 $('source').addEventListener('input',()=>revision++);
 $('input-format').addEventListener('change',()=>revision++);
 $('import').addEventListener('click',()=>change(()=>history.replace(($('input-format').value==='markdown'?parseMarkdown:parseTsv)($('source').value)),'Imported as plain text. Inline Markdown syntax is not rendered.'));
 $('example').addEventListener('click',()=>change(()=>{page=0;return history.replace(sample);},'Example loaded. Previous table can be restored with Undo.'));
 $('undo').addEventListener('click',()=>change(()=>history.undo(),'Undo applied.'));
 $('redo').addEventListener('click',()=>change(()=>history.redo(),'Redo applied.'));
 for(const [id,type] of [['add-row','addRow'],['add-col','addCol'],['transpose','transpose']])$(id).addEventListener('click',()=>apply({type}));
 const row=()=>Number($('row-select').value),col=()=>Number($('col-select').value);
 for(const [id,delta] of [['row-up',-1],['row-down',1]])$(id).addEventListener('click',()=>apply({type:'moveRow',row:row(),to:row()+delta}));
 for(const [id,delta] of [['col-left',-1],['col-right',1]])$(id).addEventListener('click',()=>apply({type:'moveCol',col:col(),to:col()+delta}));
 $('delete-row').addEventListener('click',()=>apply({type:'deleteRow',row:row()}));$('delete-col').addEventListener('click',()=>apply({type:'deleteCol',col:col()}));
 $('align').addEventListener('change',()=>apply({type:'align',col:col(),value:$('align').value}));
 $('col-select').addEventListener('change',()=>{$('align').value=history.current.align[col()];});
 $('sort').addEventListener('click',()=>apply({type:'sort',col:col()}));
 for(const [id,delta] of [['prev',-1],['next',1]])$(id).addEventListener('click',()=>{page+=delta;grid();});
 $('output-format').addEventListener('change',output);$('guard').addEventListener('change',output);
 $('copy').addEventListener('click',async()=>{const text=$('output').value;try{await (env.clipboard??globalThis.navigator.clipboard).writeText(text);say('Output copied.');}catch{say('Clipboard unavailable. Select the output text to copy it, or download the file.',true);}});
 render();
 return {history,render,say,change,get revision(){return revision;},dispose(){if(downloadUrl)urls.revokeObjectURL(downloadUrl);}};
}
if(typeof document!=='undefined')mount(document);
