import {validate,textInput,clone} from './model.mjs';
import {markdown,tsv} from './import.mjs';
export function project(input){
 const data=JSON.parse(textInput(input));
 if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).sort().join(',')!=='align,cells,schema'||data.schema!=='cellweave-table-v1')throw Error('Expected a cellweave-table-v1 project with cells and alignment only.');
 return clone(validate({cells:data.cells,align:data.align}));
}
export async function readFile(file,format){
 if(!file||!Number.isSafeInteger(file.size)||file.size>6000000)throw Error('Choose a UTF-8 file up to 6 MB.');
 const bytes=await file.arrayBuffer();
 if(bytes.byteLength>6000000)throw Error('File exceeds 6 MB.');
 const text=textInput(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 return {text,table:format==='json'?project(text):format==='markdown'?markdown(text):tsv(text)};
}
export function attachFiles(doc,app){
 const $=id=>doc.getElementById(id);let pending=0;
 $('file').addEventListener('change',async()=>{
 const file=$('file').files?.[0];if(!file)return;
 const id=++pending,revision=app.revision,format=file.name.toLowerCase().endsWith('.json')?'json':$('input-format').value;
 try{const {text,table}=await readFile(file,format);
 if(id!==pending||revision!==app.revision){app.say('File was not applied because the table or import settings changed while it was being read.');return;}
 app.change(()=>{app.history.replace(table);if(format!=='json')$('source').value=text;return true;},'File opened as plain text. Undo can restore the previous table.');
 }catch(e){if(id===pending)app.say('File not opened: '+e.message,true);}
 finally{if(id===pending)$('file').value='';}
 });
}
