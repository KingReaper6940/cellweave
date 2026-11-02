import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {sample} from '../src/example.mjs';
import {markdown,tsv,html,report} from '../src/export.mjs';
const folder=new URL('../examples/',import.meta.url);await mkdir(folder,{recursive:true});
for(const [name,text] of Object.entries({'table.md':markdown(sample),'table.tsv':tsv(sample,false).text,'table.html':html(sample),'table.json':JSON.stringify(report(sample),null,2)+'\n'}))await writeFile(new URL(name,folder),text);
console.log('Generated 4 real export examples for '+sample.cells.length+' rows × '+sample.align.length+' columns in '+fileURLToPath(folder));
