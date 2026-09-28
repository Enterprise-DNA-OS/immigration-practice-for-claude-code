#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {table} from './lib/format.mjs';
import {fields,reads,resolve,insert,validate,date,required,compliance,touch,checkRecordedDates,recordedDate} from './lib/domain.mjs';
import {importReports} from './lib/import.mjs';
export const commands=[...Object.keys(reads),'matter','attention','compliance','weekly-review','add','update','log','complete-deadline','record-lodgement','record-decision','close-matter','draft-client-update','draft-evidence-request','import','export','help'];
export async function run(db,args){
 args=args.filter(a=>a!=='--json');const [cmd='help',a,b,c,...rest]=args;
 if(reads[cmd])return db.query(reads[cmd]);
 if(cmd==='help')return {commands,usage:'npm run immigration -- <command> [args] [--json]',write:'add <entity> <JSON> | update <entity> <name-or-id> <JSON>',import:'import migration-manager <folder> [--apply] (preview by default)',entities:fields};
 if(cmd==='compliance')return compliance(db);
 if(cmd==='attention')return [
  ...(await db.query("select matter,name issue,days_left from deadline_queue where days_left<=14 order by due_on")).map(x=>({...x,reason:'Deadline within 14 days or overdue'})),
  ...(await db.query("select name matter,'No recorded action for '||(current_date-last_action_on)||' days' issue from matters where status='open' and last_action_on<current_date-14")).map(x=>({...x,reason:'Quiet matter'})),
  ...(await db.query("select matter,name issue from evidence_queue where due_on<current_date")).map(x=>({...x,reason:'Evidence overdue'}))
 ];
 if(cmd==='weekly-review')return {deadlines:await run(db,['key-dates']),evidence:await run(db,['evidence-chase']),updates:await run(db,['client-updates']),compliance:await compliance(db),workload:await run(db,['workload'])};
 if(cmd==='matter'){
  const m=await resolve(db,'matters',a),out={matter:m,client:await resolve(db,'clients',m.client_id)};
  for(const entity of ['applications','deadlines','evidence','notes','fees'])out[entity]=await db.query(`select * from ${entity} where matter_id=$1 order by created_at,id`,[m.id]);
  return out;
 }
 if(cmd==='export'){
  const out={format:'immigration-practice-v1',exported_at:new Date().toISOString(),records:{}};
  await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ');try{for(const t of [...Object.keys(fields),'import_records','audit_events'])out.records[t]=await db.query(`select * from ${t} order by id`);await db.exec('COMMIT');}catch(e){await db.exec('ROLLBACK');throw e;}
  if(a){const file=path.resolve(a);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(out,null,2),{flag:'wx',mode:0o600});return {file,counts:Object.fromEntries(Object.entries(out.records).map(([k,v])=>[k,v.length]))};}return out;
 }
 if(cmd.startsWith('draft-')){
  if(!['draft-client-update','draft-evidence-request'].includes(cmd))throw Error('Unknown draft');
  const data=await run(db,['matter',a]);const m=data.matter;
  const lines=['DRAFT ONLY: adviser review required. Nothing sent.',`Client: ${data.client.name}`,`Matter: ${m.name} (${m.visa_type})`,'',cmd==='draft-client-update'?'Recorded application progress:':'Please supply or clarify these recorded evidence items:'];
  if(cmd==='draft-client-update')for(const app of data.applications)lines.push(`${app.name}: ${app.status}; reference ${app.reference||'not recorded'}`);
  for(const e of data.evidence.filter(x=>x.required&&!x.verified_on))lines.push(`${e.name}: ${e.received_on?'received, awaiting verification':'not recorded as received'}; due ${e.due_on||'not set'}`);
  for(const d of data.deadlines.filter(x=>!x.done_on))lines.push(`Recorded date: ${d.name}, ${d.due_on}. Source: ${d.source_ref}`);
  lines.push('','Dates are transcribed records. The adviser checks the source notice before giving advice.');
  const dir=path.join(process.env.OUTPUT_DIR||REPO_ROOT,'drafts');fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,`${cmd}-${m.id}-${Date.now()}.txt`);fs.writeFileSync(file,lines.join('\n')+'\n',{flag:'wx',mode:0o600});return {file};
 }
 if(!commands.includes(cmd))throw Error('Unknown command: '+cmd);
 await db.exec('BEGIN');
 try{
  let result;
  if(cmd==='add')result=await insert(db,a,JSON.parse(required(b,'JSON')));
  else if(cmd==='update'){
   const r=await resolve(db,a,b),obj=validate(a,JSON.parse(required(c,'JSON')));
   await checkRecordedDates(db,obj);
   for(const k of Object.keys(obj))if(['client_id','matter_id','jurisdiction','opened_on'].includes(k))throw Error('Relationship or opening date is immutable: '+k);
   if(a==='notes')throw Error('Notes are append-only; log a correction');
   if(a==='matters'&&r.status==='closed')throw Error('Matter is closed');
   if(r.matter_id){const m=await resolve(db,'matters',r.matter_id);if(m.status==='closed')throw Error('Matter is closed');}
   if(a==='matters'&&obj.adviser_id){const adv=await resolve(db,'advisers',obj.adviser_id);if(adv.jurisdiction!==r.jurisdiction)throw Error('Adviser jurisdiction mismatch');}
   const keys=Object.keys(obj);[result]=await db.query(`update ${a} set ${keys.map((k,i)=>k+'=$'+(i+2)).join(',')} where id=$1 returning *`,[r.id,...Object.values(obj)]);
   if(r.matter_id)await touch(db,r.matter_id);else if(a==='matters')await touch(db,r.id);
  }else if(cmd==='log'){
   const m=await resolve(db,'matters',a);result=await insert(db,'notes',{...JSON.parse(required(b,'note JSON')),matter_id:m.id});
  }else if(cmd==='import'){
   if(a!=='migration-manager')throw Error('Supported import: migration-manager');required(b,'folder');if(c&&c!=='--apply')throw Error('Only --apply is supported');
   result=await importReports(db,b,c==='--apply');if(!result.applied){await db.exec('ROLLBACK');return result;}
  }else if(cmd==='complete-deadline'){
   const d=await resolve(db,'deadlines',a);if(d.done_on)throw Error('Deadline already completed');
   await recordedDate(db,b);required(c,'completion note');[result]=await db.query('update deadlines set done_on=$2,completion_note=$3 where id=$1 returning *',[d.id,b,c]);await touch(db,d.matter_id);
  }else if(cmd==='record-lodgement'){
   const app=await resolve(db,'applications',a),m=await resolve(db,'matters',app.matter_id);if(app.status!=='preparing'||m.status!=='open')throw Error('Application must be preparing on an open matter');
   if(!m.agreement_on||!m.agreement_ref||!m.fee_basis)throw Error('Written agreement and fee basis required');
   const issues=(await compliance(db)).filter(x=>x.matter===m.name&&['PRACTICE-LICENCE','NZ-14'].includes(x.rule));if(issues.length)throw Error(issues.map(x=>x.issue).join('; '));
   const gaps=await db.query('select name from evidence where matter_id=$1 and required and verified_on is null',[m.id]);if(gaps.length)throw Error('Unverified evidence: '+gaps.map(x=>x.name).join(', '));
   await recordedDate(db,c);required(b,'lodgement reference');required(rest[0],'application copy');
   [result]=await db.query("update applications set status='lodged',reference=$2,lodged_on=$3,copy_ref=$4 where id=$1 returning *",[app.id,b,c,rest[0]]);await touch(db,m.id);
  }else if(cmd==='record-decision'){
   const app=await resolve(db,'applications',a);if(app.status!=='lodged')throw Error('Application must be lodged');await recordedDate(db,b);required(c,'outcome');
   [result]=await db.query("update applications set status='decided',decision_on=$2,outcome=$3 where id=$1 returning *",[app.id,b,c]);await touch(db,app.matter_id);
  }else if(cmd==='close-matter'){
   const m=await resolve(db,'matters',a);if(m.status==='closed')throw Error('Already closed');
   const open=await db.query("select name from deadlines where matter_id=$1 and done_on is null union all select name from applications where matter_id=$1 and status in ('preparing','lodged') union all select name from evidence where matter_id=$1 and original_held and returned_on is null",[m.id]);
   if(open.length)throw Error('Cannot close with unfinished records: '+open.map(x=>x.name).join(', '));
   [result]=await db.query("update matters set status='closed',closed_on=current_date,last_action_on=current_date,archive_until=greatest(archive_until,(current_date+interval '7 years')::date) where id=$1 returning *",[m.id]);
  }else throw Error('Unsupported command');
  await db.exec('COMMIT');return result;
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
export function format(result){
 if(Array.isArray(result)){if(!result.length)return '(none)';const keys=Object.keys(result[0]).filter(k=>k!=='id');return table(result,keys.map(key=>({key,label:key,width:65})));}
 return JSON.stringify(result,null,2);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 let db;try{db=await getDb();const r=await run(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(r,null,2):format(r));}
 catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}
}
