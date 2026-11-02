export const LIMITS=Object.freeze({rows:100,cols:24,cell:1000,text:100000});
export function validate(table){
 if(!table||!Array.isArray(table.cells)||table.cells.length<1||table.cells.length>LIMITS.rows)throw Error('Use 1–100 rows, including the header.');
 const width=table.cells[0]?.length;
 if(!Number.isInteger(width)||width<1||width>LIMITS.cols)throw Error('Use 1–24 columns.');
 if(!Array.isArray(table.align)||table.align.length!==width||table.align.some(a=>!['none','left','center','right'].includes(a)))throw Error('Invalid column alignment.');
 let size=0;
 for(const row of table.cells){if(!Array.isArray(row)||row.length!==width)throw Error('Every row must have the same number of cells; no cells were discarded.');
 for(const cell of row){if(typeof cell!=='string'||cell.length>LIMITS.cell||/[\u0000-\u001f\u007f\u2028\u2029]/u.test(cell)||!cell.isWellFormed())throw Error('Cells must be single-line text, at most 1,000 UTF-16 units, without control characters or broken Unicode.');size+=cell.length;}}
 if(size>LIMITS.text)throw Error('Table text exceeds 100,000 UTF-16 units.');
 return table;
}
export function clone(t){validate(t);return {cells:t.cells.map(r=>[...r]),align:[...t.align]};}
export function textInput(s){if(typeof s!=='string'||s.length>1500000)throw Error('Source must be at most 1,500,000 UTF-16 units.');return s.replace(/^\uFEFF/u,'').replace(/\r\n?/g,'\n');}
