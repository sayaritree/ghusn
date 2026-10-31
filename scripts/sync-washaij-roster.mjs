import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

// Rebuild the function's immutable ID catalogue from the exact Washaij tree bundled
// into this deployment. Names are never treated as keys.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(resolve(root,'washaij-site/washaij-core.html'),'utf8');
const match=html.match(/window\.GHOSN_ROWS\s*=\s*(\[[\s\S]*?\]);/);
if(!match)throw Error('Washaij source roster was not found');
const rows=JSON.parse(match[1]);
const unique=new Map();
for(const r of rows){
 const id=String(r.id||'');
 if(!/^\d{1,12}$/.test(id))continue;
 if(!unique.has(id))unique.set(id,{id,name:r.name||'',gender:r.gender||'',fatherId:String(r.fatherId||''),motherId:String(r.motherId||''),spouseIds:[]});
 const person=unique.get(id),spouseId=String(r.spouseId||'');
 if(spouseId&&!person.spouseIds.includes(spouseId))person.spouseIds.push(spouseId);
}
if(unique.size<50)throw Error('Abnormally small family source, refuse to regenerate');
const dest=resolve(root,'netlify/washaij-functions/ghusn-admin.mjs');
const source=readFileSync(dest,'utf8');
const pattern=/const ROSTER=\[[^\n]*\];/;
if(!pattern.test(source))throw Error('Missing roster insertion marker');
const updated=source.replace(pattern,'const ROSTER='+JSON.stringify([...unique.values()])+';');
if(updated!==source)writeFileSync(dest,updated,'utf8');
console.log('Washaij roster synchronized:',unique.size,'unique people');
