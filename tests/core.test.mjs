import test from 'node:test';
import assert from 'node:assert/strict';
import {markdown as parse,tsv as parseTsv,decodeCell} from '../src/import.mjs';
import {markdown,tsv,html,report} from '../src/export.mjs';
import {validate} from '../src/model.mjs';
import {History,edit} from '../src/edit.mjs';
import {project,readFile} from '../src/handoff.mjs';
const make=cells=>({cells,align:Array(cells[0].length).fill('none')});
test('imports optional borders, alignment, escaped pipes and one-pass entities',()=>{
 const t=parse('| A | B |\n :-- | --: \n x\\|y | &amp;lt; ');
 assert.deepEqual(t,{cells:[['A','B'],['x|y','&lt;']],align:['left','right']});
 assert.equal(decodeCell('\\*x\\* &#x1f30d;'),'*x* 🌍');
 assert.deepEqual(parse('|a|\n|-|').cells,[['a']]);
});
test('does not silently truncate or pad ragged Markdown or TSV',()=>{
 for(const s of ['|a|b|\n|-|-|\nx','a|b\n-|-\nx|y|z','a|b\n-\nx|y'])assert.throws(()=>parse(s),/Ragged/);
 assert.throws(()=>parseTsv('a\tb\nx'),/same number/);
});
test('rejects full documents, malformed delimiters, blank body lines and multiline cells',()=>{
 for(const s of ['# Title\n\n|a|\n|-|','a|b\nx|y','|a|\n|-|\n\n|b|'])assert.throws(()=>parse(s));
 assert.throws(()=>parseTsv('"a\nb"\tc'),/single-line/);
 assert.throws(()=>parse('|a|\n|-|\n&#9;'),/single-line/);
 assert.throws(()=>parse('|a|\n|-|\n&#xD800;'),/Invalid numeric/);
});
test('TSV quoting preserves quotes, empty edge cells, spaces and final empty rows',()=>{
 const t=make([['','quote "here"',' x '],['a|b','','']]);
 assert.deepEqual(parseTsv(tsv(t,false).text),t);
 assert.deepEqual(parseTsv('a\n\n').cells,[['a'],['']]);
 assert.throws(()=>parseTsv('"a'),/Unclosed/);
 assert.throws(()=>parseTsv('"a"x'),/Unexpected/);
});
test('literal Markdown roundtrips every ASCII printable and meaningful Unicode',()=>{
 for(let code=32;code<=126;code++){
 const t={cells:[['Header','Second'],[String.fromCodePoint(code),' 🌍 café 漢字 &amp; \\| ']],align:['center','right']};
 assert.deepEqual(parse(markdown(t)),t,'ASCII '+code);
 }
});
test('generated rectangular table roundtrips both unguarded TSV and literal Markdown',()=>{
 for(let n=1;n<=60;n++){
 const cols=1+n%9,rows=1+n%20;
 const t={cells:Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>['','a|b','"q"','**bold**','&lt;',' \\😀 '][(r+c+n)%6])),align:Array.from({length:cols},(_,i)=>['none','left','center','right'][i%4])};
 assert.deepEqual(parse(markdown(t)),t);
 assert.deepEqual(parseTsv(tsv(t,false).text).cells,t.cells);
 }
});
test('maximal model output remains importable, including escaped source size',()=>{
 const cells=Array.from({length:100},()=>Array(24).fill(''));
 for(let i=0;i<100;i++)cells[i][i%24]='&'.repeat(1000);
 const t=make(cells),md=markdown(t);
 assert.ok(md.length<1500000);assert.deepEqual(parse(md),t);assert.deepEqual(project(JSON.stringify(report(t))),t);
});
test('limits reject excessive cells, shape, controls, malformed Unicode and source size',()=>{
 for(const cells of [[],[Array(25).fill('')],Array.from({length:101},()=>['x']),[['a'.repeat(1001)]],[['\u0000']],[['\uD800']]])assert.throws(()=>validate(make(cells.length?cells:[[]])));
 assert.throws(()=>validate(make(Array.from({length:100},()=>Array(2).fill('a'.repeat(1000))))),/100,000/);
 assert.throws(()=>parseTsv('x'.repeat(1500001)),/1,500,000/);
});
test('edits are immutable; column move carries alignment and header remains fixed',()=>{
 const t={cells:[['a','b'],['x','y'],['p','q']],align:['left','right']},before=JSON.stringify(t);
 const moved=edit(t,{type:'moveCol',col:0,to:1});
 assert.deepEqual(moved,{cells:[['b','a'],['y','x'],['q','p']],align:['right','left']});assert.equal(JSON.stringify(t),before);
 assert.throws(()=>edit(t,{type:'deleteRow',row:0}));assert.throws(()=>edit(t,{type:'moveRow',row:1,to:0}));
 assert.deepEqual(edit(t,{type:'moveRow',row:1,to:2}).cells,[['a','b'],['p','q'],['x','y']]);
});
test('transpose includes header, resets alignment and refuses oversized results atomically',()=>{
 const t={cells:[['a','b'],['c','d'],['e','f']],align:['left','right']};
 const x=edit(t,{type:'transpose'});assert.deepEqual(x,{cells:[['a','c','e'],['b','d','f']],align:['none','none','none']});
 assert.deepEqual(edit(x,{type:'transpose'}).cells,t.cells);
 assert.throws(()=>edit(make(Array.from({length:25},()=>['a'])),{type:'transpose'}),/columns/);
});
test('sort is stable, case sensitive, keeps header and does not parse numbers',()=>{
 const t=make([['key','id'],['2','a'],['10','b'],['2','c'],['A','d'],['a','e']]);
 assert.deepEqual(edit(t,{type:'sort',col:0}).cells.map(r=>r[1]),['id','b','a','c','d','e']);
});
test('history bounds snapshots, restores exact alignment and invalidates redo',()=>{
 const h=new History(make([['a']]));
 for(let i=0;i<40;i++)h.apply({type:'cell',row:0,col:0,value:String(i)});
 assert.equal(h.past.length,30);assert.equal(h.undo(),true);assert.equal(h.current.cells[0][0],'38');
 assert.equal(h.redo(),true);assert.equal(h.current.cells[0][0],'39');
 h.undo();h.apply({type:'align',col:0,value:'right'});assert.equal(h.future.length,0);h.undo();assert.equal(h.current.align[0],'none');
 const before=JSON.stringify(h);assert.throws(()=>h.apply({type:'deleteCol',col:0}));assert.equal(JSON.stringify(h),before);
});
test('guard counts formula-like cells without mutating exact text or unguarded export',()=>{
 const t=make([['=SUM(A1)',' +2','-3','@x','12','safe']]),before=JSON.stringify(t);
 const result=tsv(t);assert.equal(result.guarded,4);assert.equal(parseTsv(result.text).cells[0][0],"'=SUM(A1)");
 assert.deepEqual(parseTsv(tsv(t,false).text),t);assert.equal(JSON.stringify(t),before);
});
test('HTML escaping prevents active content and JSON projects reject unknown versions/fields',()=>{
 const t=make([['<img src=x onerror=bad()>','& " <script>']]);const s=html(t);assert.ok(!s.includes('<img'));assert.ok(s.includes('&lt;img'));assert.ok(s.includes('&amp;'));
 assert.deepEqual(project(JSON.stringify(report(t))),t);
 for(const bad of [{...report(t),schema:'v2'},{...report(t),extra:1},{schema:'cellweave-table-v1',cells:[['a']],align:['invalid']}])assert.throws(()=>project(JSON.stringify(bad)));
});
test('files require bounded fatal UTF-8 and preserve table shape',async()=>{
 const bytes=new TextEncoder().encode('a\tb\nx\ty');
 const file={size:bytes.length,arrayBuffer:async()=>bytes.buffer};
 assert.deepEqual((await readFile(file,'tsv')).table.cells,[['a','b'],['x','y']]);
 await assert.rejects(()=>readFile({size:6000001},'tsv'),/6 MB/);
 await assert.rejects(()=>readFile({size:1,arrayBuffer:async()=>Uint8Array.of(0xff).buffer},'tsv'));
});
