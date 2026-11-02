import {validate} from './model.mjs';
export const htmlEscape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const formulaLike=s=>/^\s*[=+\-@]/u.test(s);
export function literalCell(s){
 // Character references prevent punctuation being interpreted as inline Markdown.
 return [...s].map(c=>{const n=c.codePointAt(0);return n===32||n>=33&&n<=126&&/[^a-z0-9]/i.test(c)?'&#'+n+';':c;}).join('');
}
export function markdown(table){
 validate(table);const matrix=table.cells.map(r=>r.map(literalCell)),widths=table.align.map((_,c)=>Math.max(3,...matrix.map(r=>r[c].length)));
 const row=r=>'| '+r.map((v,c)=>v.padEnd(widths[c])).join(' | ')+' |';
 const delimiter=table.align.map((a,c)=>a==='left'?':'+ '-'.repeat(widths[c]-1):a==='right'?'-'.repeat(widths[c]-1)+':':a==='center'?':'+ '-'.repeat(widths[c]-2)+':':'-'.repeat(widths[c]));
 return [row(matrix[0]),row(delimiter),...matrix.slice(1).map(row)].join('\n')+'\n';
}
export function tsv(table,guard=true){
 validate(table);let guarded=0;
 const quote=s=>s.includes('"')?'"'+s.replaceAll('"','""')+'"':s;
 const text=table.cells.map(r=>r.map(s=>{if(guard&&formulaLike(s)){guarded++;s="'"+s;}return quote(s);}).join('\t')).join('\n')+'\n';
 return {text,guarded};
}
export function html(table){
 validate(table);return '<!doctype html>\n<html lang="en"><meta charset="utf-8"><title>Table export</title><table>\n<thead><tr>'+table.cells[0].map(s=>'<th scope="col">'+htmlEscape(s)+'</th>').join('')+'</tr></thead>\n<tbody>\n'+table.cells.slice(1).map(r=>'<tr>'+r.map(s=>'<td>'+htmlEscape(s)+'</td>').join('')+'</tr>').join('\n')+'\n</tbody></table></html>\n';
}
export function report(table){validate(table);return {schema:'cellweave-table-v1',cells:table.cells.map(r=>[...r]),align:[...table.align]};}
