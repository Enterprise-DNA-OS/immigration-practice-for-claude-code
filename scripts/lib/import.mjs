import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {parseCsv} from './csv.mjs';
import {fields,insert} from './domain.mjs';
// Migration Manager custom reports have user-selected headings. This is an explicit
// interchange contract, not a claim that every vendor report has identical columns.
export async function importReports(db,dir,apply=false){
 const stats={applied:apply,inserted:0,skipped:0,entities:{}};
 const maps={clients:new Map(),advisers:new Map(),matters:new Map()};
 for(const entity of Object.keys(fields)){
  const file=path.join(dir,entity+'.csv');if(!fs.existsSync(file))continue;
  const rows=parseCsv(fs.readFileSync(file,'utf8'));const seen=new Set();stats.entities[entity]=rows.length;
  for(const row of rows){
   const key=row.source_id?.trim();if(!key||seen.has(key))throw Error(entity+': missing or duplicate source_id');seen.add(key);
   const name='migration-manager:'+entity+':'+key;
   const fingerprint=createHash('sha256').update(JSON.stringify(row)).digest('hex');
   const [old]=await db.query('select * from import_records where name=$1',[name]);
   if(old){if(old.fingerprint!==fingerprint)throw Error('Changed source row needs reconciliation: '+name);if(maps[entity])maps[entity].set(key,old.target_id);stats.skipped++;continue;}
   const obj={};
   for(const [k,v] of Object.entries(row)){
    if(k==='source_id')continue;
    if(k.endsWith('_source_id')){const dest=k.replace('_source_id','_id'),table=k.replace('_source_id','')+'s';const id=maps[table]?.get(v);if(!id)throw Error('Unresolved '+k+': '+v);obj[dest]=id;}
    else {if(!fields[entity].includes(k)||k.endsWith('_id'))throw Error('Unmapped CSV column: '+k);if(v==='')continue;obj[k]=['required','original_held'].includes(k)?bool(v):v;}
   }
   const record=await insert(db,entity,obj);
   await db.query('insert into import_records(name,entity,target_id,fingerprint) values($1,$2,$3,$4)',[name,entity,record.id,fingerprint]);
   if(maps[entity])maps[entity].set(key,record.id);stats.inserted++;
  }
 }
 if(!Object.keys(stats.entities).length)throw Error('No supported CSV reports found');
 return stats;
}
function bool(v){if(!['true','false'].includes(v.toLowerCase()))throw Error('CSV boolean must be true or false');return v.toLowerCase()==='true';}
