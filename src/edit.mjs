import {clone,validate} from './model.mjs';
export function edit(table,action){
 const t=clone(table),rows=t.cells.length,cols=t.align.length;
 const index=(i,n)=>{if(!Number.isInteger(i)||i<0||i>=n)throw Error('Select a valid row or column.');};
 switch(action.type){
 case 'cell':index(action.row,rows);index(action.col,cols);t.cells[action.row][action.col]=action.value;break;
 case 'align':index(action.col,cols);t.align[action.col]=action.value;break;
 case 'addRow':t.cells.push(Array(cols).fill(''));break;
 case 'addCol':t.cells.forEach(r=>r.push(''));t.align.push('none');break;
 case 'deleteRow':index(action.row,rows);if(action.row===0)throw Error('The header cannot be deleted.');t.cells.splice(action.row,1);break;
 case 'deleteCol':index(action.col,cols);if(cols===1)throw Error('Keep at least one column.');t.cells.forEach(r=>r.splice(action.col,1));t.align.splice(action.col,1);break;
 case 'moveRow':{index(action.row,rows);index(action.to,rows);if(action.row===0||action.to===0)throw Error('The header stays in row 1.');const [r]=t.cells.splice(action.row,1);t.cells.splice(action.to,0,r);break;}
 case 'moveCol':{index(action.col,cols);index(action.to,cols);for(const r of t.cells){const [v]=r.splice(action.col,1);r.splice(action.to,0,v);}const [a]=t.align.splice(action.col,1);t.align.splice(action.to,0,a);break;}
 case 'transpose':t.cells=t.cells[0].map((_,c)=>t.cells.map(r=>r[c]));t.align=Array(rows).fill('none');break;
 case 'sort':{index(action.col,cols);const sign=action.desc?-1:1;const header=t.cells.shift();t.cells.sort((a,b)=>a[action.col]===b[action.col]?0:(a[action.col]<b[action.col]?-1:1)*sign);t.cells.unshift(header);break;}
 default:throw Error('Unsupported edit.');
 }return validate(t);
}
export class History{
 constructor(table){this.current=clone(table);this.past=[];this.future=[];}
 replace(table){const next=clone(table);if(JSON.stringify(next)===JSON.stringify(this.current))return false;this.past.push(this.current);if(this.past.length>30)this.past.shift();this.current=next;this.future=[];return true;}
 apply(action){return this.replace(edit(this.current,action));}
 undo(){if(!this.past.length)return false;this.future.push(this.current);this.current=this.past.pop();return true;}
 redo(){if(!this.future.length)return false;this.past.push(this.current);this.current=this.future.pop();return true;}
}
