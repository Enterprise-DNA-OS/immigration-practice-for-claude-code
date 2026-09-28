export const AU='https://www.mara.gov.au/tools-for-agents-subsite/Files/code-of-conduct-march-2022.pdf';
export const NZ='https://www.iaa.govt.nz/for-advisers/code-of-conduct/professional-practice/';
export const fields={
 clients:['name','email','nationality'],
 advisers:['name','jurisdiction','licence_number','licence_expires'],
 matters:['name','client_id','adviser_id','jurisdiction','visa_type','opened_on','agreement_ref','agreement_on','fee_basis','licence_evidence_ref','archive_until'],
 applications:['name','matter_id','copy_ref'],
 deadlines:['name','matter_id','kind','due_on','source_ref'],
 evidence:['name','matter_id','required','due_on','received_on','verified_on','file_ref','original_held','returned_on','return_ref'],
 notes:['name','matter_id','happened_on','kind','author','body','confirmed_ref'],
 fees:['name','matter_id','currency','amount','paid','due_on','invoice_ref','receipt_ref']
};
export const reads={
 clients:'select id,name,email,nationality from clients order by name',
 advisers:'select id,name,jurisdiction,licence_number,licence_expires from advisers order by name',
 matters:"select * from matter_board where status='open' order by next_due nulls last,name",
 applications:'select a.id,a.name,m.name matter,a.status,a.reference,a.lodged_on,a.copy_ref from applications a join matters m on m.id=a.matter_id order by a.name',
 'key-dates':'select * from deadline_queue order by due_on,name',
 'visa-expiries':"select * from deadline_queue where kind='visa-expiry' and days_left<=60 order by due_on",
 'evidence-chase':'select * from evidence_queue order by due_on nulls last,name',
 'client-updates':"select id,name,client,adviser,last_client_update,quiet_days,next_due from matter_board where status='open' and (last_client_update is null or last_client_update<current_date-14) order by last_client_update nulls first",
 'fee-balances':'select * from fee_balances order by overdue_days desc,name',
 'originals-return':"select e.id,e.name,m.name matter,e.received_on,e.return_ref from evidence e join matters m on m.id=e.matter_id where original_held and returned_on is null order by received_on",
 retention:'select * from retention_register order by name',
 workload:"select adviser,jurisdiction,count(*)::int open_matters,sum(evidence_gaps)::int evidence_gaps,count(*) filter(where quiet_days>=14)::int quiet_matters from matter_board where status='open' group by adviser,jurisdiction order by adviser"
};
export function validate(entity,obj){
 if(!fields[entity])throw Error('Unknown entity: '+entity);
 if(!obj||Array.isArray(obj)||typeof obj!=='object'||!Object.keys(obj).length)throw Error('Expected a nonempty JSON object');
 for(const [k,v] of Object.entries(obj)){
  if(!fields[entity].includes(k))throw Error('Unknown or protected field: '+k);
  if(v===null)continue;
  if(['required','original_held'].includes(k)){if(typeof v!=='boolean')throw Error('Boolean required: '+k);}
  else if(['amount','paid'].includes(k)){if(!/^\d{1,12}(\.\d{1,2})?$/.test(String(v)))throw Error('Invalid money: '+k);}
  else if(typeof v!=='string')throw Error('Text required: '+k);
  if(k.endsWith('_on')||['licence_expires','archive_until'].includes(k))date(v);
  if(k.endsWith('_id')&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))throw Error('UUID required: '+k);
 }
 return obj;
}
export function date(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)throw Error('Expected real YYYY-MM-DD date: '+s);return s;}
export function required(s,label){if(typeof s!=='string'||!s.trim())throw Error('Required: '+label);return s;}
export async function resolve(db,entity,term){
 if(!fields[entity])throw Error('Unknown entity');required(term,'record');
 const exact=await db.query(`select * from ${entity} where lower(name)=lower($1) or id::text=$1`,[term]);
 const rows=exact.length?exact:await db.query(`select * from ${entity} where position(lower($1) in lower(name))>0 or starts_with(id::text,lower($1)) order by name`,[term]);
 if(rows.length!==1)throw Error(rows.length?'Ambiguous '+entity+':\n'+rows.map(x=>x.id+' '+x.name).join('\n'):'No '+entity+' matches '+term);
 return rows[0];
}
export async function compliance(db){
 const out=[];
 const add=(m,rule,issue,source)=>out.push({matter:m.name,jurisdiction:m.jurisdiction,rule,issue,source});
 const ms=await db.query('select m.*,a.jurisdiction adviser_jurisdiction,a.licence_expires from matters m left join advisers a on a.id=m.adviser_id');
 const [now]=await db.query('select current_date::text today');
 for(const m of ms){
  const src=m.jurisdiction==='AU'?AU:NZ;
  if(!m.agreement_ref||!m.agreement_on||!m.fee_basis)add(m,m.jurisdiction==='AU'?'AU-42':'NZ-18','Written agreement or fee basis missing',src);
  if(m.status==='open'&&(!m.adviser_id||m.adviser_jurisdiction!==m.jurisdiction||m.licence_expires<now.today))add(m,'PRACTICE-LICENCE','Assigned adviser missing, wrong jurisdiction or recorded licence expired','docs/compliance.md#practice-checks');
  if(m.jurisdiction==='NZ'&&!m.licence_evidence_ref)add(m,'NZ-14','Licence evidence supplied to client not recorded',NZ);
  const r=(await db.query('select * from retention_register where id=$1',[m.id]))[0];
  if(r.required_until&&(!m.archive_until||m.archive_until<r.required_until))add(m,m.jurisdiction==='AU'?'AU-56':'NZ-26','Archive review date earlier than retention floor or missing',src);
 }
 for(const a of await db.query("select m.name,m.jurisdiction from applications a join matters m on m.id=a.matter_id where a.status in ('lodged','decided') and a.copy_ref=''"))add(a,a.jurisdiction==='AU'?'AU-56':'NZ-26','Lodged application copy reference missing',a.jurisdiction==='AU'?AU:NZ);
 for(const n of await db.query("select m.name,m.jurisdiction from notes n join matters m on m.id=n.matter_id where n.kind='oral' and n.confirmed_ref='' and m.jurisdiction='NZ'"))add(n,'NZ-26','Material oral discussion lacks written confirmation reference',NZ);
 for(const f of await db.query("select m.name,m.jurisdiction from fees f join matters m on m.id=f.matter_id where f.invoice_ref='' or (f.paid>0 and f.receipt_ref='')"))add(f,f.jurisdiction==='AU'?'AU-56':'NZ-26','Invoice or receipt copy reference missing',f.jurisdiction==='AU'?AU:NZ);
 return out;
}
export async function insert(db,entity,obj){
 validate(entity,obj);
 await checkRecordedDates(db,obj);
 if(entity==='matters'&&obj.adviser_id){const [a]=await db.query('select jurisdiction from advisers where id=$1',[obj.adviser_id]);if(a&&a.jurisdiction!==obj.jurisdiction)throw Error('Adviser jurisdiction mismatch');}
 if(obj.matter_id){const [m]=await db.query('select status from matters where id=$1',[obj.matter_id]);if(m?.status==='closed')throw Error('Matter is closed');}
 const keys=Object.keys(obj);const [r]=await db.query(`insert into ${entity} (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(obj));
 if(r.matter_id)await touch(db,r.matter_id,r.kind==='client-update'?r.happened_on:null);
 return r;
}
export async function touch(db,id,clientUpdate=null){
 await db.query('update matters set last_action_on=greatest(last_action_on,current_date),last_client_update=case when $2::date is null then last_client_update else greatest(last_client_update,$2::date) end where id=$1',[id,clientUpdate]);
}

export async function checkRecordedDates(db,obj){
 const [r]=await db.query('select current_date::text today');
 for(const key of ['opened_on','agreement_on','received_on','verified_on','returned_on','happened_on'])
  if(obj[key] && obj[key]>r.today)throw Error('Recorded event cannot be in the future: '+key);
 if(obj.licence_number!==undefined&&!String(obj.licence_number).trim())throw Error('Licence number required');
}
export async function recordedDate(db,value){
 date(value);const [r]=await db.query('select current_date::text today');
 if(value>r.today)throw Error('Recorded event cannot be in the future');return value;
}
