import {validate,textInput} from './model.mjs';
function split(line){
 const cells=[];let cell='',slashes=0;
 for(const c of line.trim()){if(c==='|'&&slashes%2===0){cells.push(cell);cell='';}else cell+=c;slashes=c==='\\'?slashes+1:0;}cells.push(cell);
 if(line.trim().startsWith('|'))cells.shift();
 // An escaped last pipe is content, never a border.
 const end=line.trim();let n=0;for(let i=end.length-2;i>=0&&end[i]==='\\';i--)n++;
 if(end.endsWith('|')&&n%2===0)cells.pop();
 return cells.map(c=>c.trim());
}
const names={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:'\u00a0'};
export function decodeCell(s){
 // One pass: entities produced by an escape/entity are never recursively decoded.
 return s.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~])|&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(all,escaped,entity)=>{
 if(escaped)return escaped;
 if(entity[0]!=='#')return names[entity.toLowerCase()]??all;
 const n=entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):Number(entity.slice(1));
 if(!Number.isInteger(n)||n<1||n>0x10ffff||n>=0xd800&&n<=0xdfff)throw Error('Invalid numeric character reference.');
 return String.fromCodePoint(n);
 });
}
export function markdown(input){
 const text=textInput(input).trim();const lines=text.split('\n');
 if(lines.length<2||lines.some(l=>!l.trim()))throw Error('Paste one table only, with a header and delimiter row; no blank lines.');
 const rows=lines.map(split),width=rows[0].length;
 if(rows.some(r=>r.length!==width))throw Error('Ragged table: every row must match the header; nothing was truncated or padded.');
 if(rows[1].some(c=>!/^:?-+:?$/.test(c)))throw Error('The second row must contain hyphens and optional alignment colons.');
 const align=rows[1].map(c=>c.startsWith(':')&&c.endsWith(':')?'center':c.startsWith(':')?'left':c.endsWith(':')?'right':'none');
 return validate({cells:[rows[0],...rows.slice(2)].map(r=>r.map(decodeCell)),align});
}
export function tsv(input){
 const s=textInput(input);let rows=[],row=[],cell='',quoted=false,closed=false,start=true;
 const finish=()=>{row.push(cell);cell='';closed=false;start=true;};
 for(let i=0;i<s.length;i++){const c=s[i];
 if(quoted){if(c==='"'){if(s[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
 if(closed&&c!=='\t'&&c!=='\n')throw Error('Unexpected text after a closing TSV quote.');
 if(c==='\t'){finish();continue;}if(c==='\n'){finish();rows.push(row);row=[];continue;}
 if(c==='"'&&start){quoted=true;start=false;}else{cell+=c;start=false;}
 }
 if(quoted)throw Error('Unclosed TSV quote.');
 if(s.endsWith('\n')&&row.length===0&&cell===''){}else{finish();rows.push(row);}
 return validate({cells:rows,align:Array(rows[0]?.length??0).fill('none')});
}
