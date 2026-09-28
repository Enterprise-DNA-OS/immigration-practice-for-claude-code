create function stamp_updated() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create table clients (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0), email text not null default '', nationality text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table advisers (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0), jurisdiction text not null check(jurisdiction in ('AU','NZ')),
 licence_number text not null, licence_expires date not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table matters (
 id uuid primary key default gen_random_uuid(), name text not null unique check(length(trim(name))>0), client_id uuid not null references clients,
 adviser_id uuid references advisers, jurisdiction text not null check(jurisdiction in ('AU','NZ')), visa_type text not null,
 status text not null default 'open' check(status in ('open','closed')), opened_on date not null default current_date, closed_on date,
 agreement_ref text not null default '', agreement_on date, fee_basis text not null default '', licence_evidence_ref text not null default '',
 last_action_on date not null default current_date, last_client_update date, archive_until date,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check((status='closed')=(closed_on is not null)), check(closed_on is null or closed_on>=opened_on),
 check(agreement_on is null or agreement_ref<>''), check(last_action_on>=opened_on)
);
create table applications (
 id uuid primary key default gen_random_uuid(), name text not null unique, matter_id uuid not null references matters,
 status text not null default 'preparing' check(status in ('preparing','lodged','decided','withdrawn')),
 reference text not null default '', lodged_on date, decision_on date, outcome text not null default '', copy_ref text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(status not in ('lodged','decided') or (lodged_on is not null and reference<>'')),
 check(status<>'decided' or (decision_on is not null and outcome<>'')), check(decision_on is null or decision_on>=lodged_on)
);
create table deadlines (
 id uuid primary key default gen_random_uuid(), name text not null, matter_id uuid not null references matters,
 kind text not null check(kind in ('visa-expiry','response','lodgement','passport','review','other')), due_on date not null,
 source_ref text not null check(length(trim(source_ref))>0), done_on date, completion_note text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(done_on is null or completion_note<>'')
);
create table evidence (
 id uuid primary key default gen_random_uuid(), name text not null, matter_id uuid not null references matters,
 required boolean not null default true, due_on date, received_on date, verified_on date, file_ref text not null default '',
 original_held boolean not null default false, returned_on date, return_ref text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(verified_on is null or (received_on is not null and file_ref<>'' and verified_on>=received_on)),
 check(returned_on is null or return_ref<>'')
);
create table notes (
 id uuid primary key default gen_random_uuid(), name text not null, matter_id uuid not null references matters,
 happened_on date not null default current_date, kind text not null check(kind in ('internal','oral','client-update')), author text not null,
 body text not null check(length(trim(body))>0), confirmed_ref text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(kind<>'client-update' or confirmed_ref<>'')
);
create table fees (
 id uuid primary key default gen_random_uuid(), name text not null unique, matter_id uuid not null references matters,
 currency text not null check(currency in ('AUD','NZD')), amount numeric(14,2) not null check(amount>=0), paid numeric(14,2) not null default 0 check(paid>=0),
 due_on date not null, invoice_ref text not null, receipt_ref text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(paid<=amount)
);
create table import_records (
 id uuid primary key default gen_random_uuid(), name text not null unique, entity text not null, target_id uuid not null, fingerprint text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table audit_events (
 id uuid primary key default gen_random_uuid(), name text not null, entity text not null, record_id uuid not null, before_record jsonb, after_record jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function audit_write() returns trigger language plpgsql as $$ begin
 insert into audit_events(name,entity,record_id,before_record,after_record) values(TG_OP,TG_TABLE_NAME,new.id,case when TG_OP='UPDATE' then to_jsonb(old) else null end,to_jsonb(new)); return new; end $$;
do $$ declare t text; begin foreach t in array array['clients','advisers','matters','applications','deadlines','evidence','notes','fees','import_records'] loop
 execute format('create trigger updated before update on %I for each row execute function stamp_updated()',t);
 if t<>'import_records' then execute format('create trigger audit after insert or update on %I for each row execute function audit_write()',t); end if;
 end loop; end $$;
create index deadlines_matter on deadlines(matter_id);
create index evidence_matter on evidence(matter_id);
create index notes_matter on notes(matter_id);
create index applications_matter on applications(matter_id);
create index fees_matter on fees(matter_id);
create view matter_board as
select m.id,m.name,c.name client,m.jurisdiction,m.visa_type,m.status,coalesce(a.name,'UNASSIGNED') adviser,
 current_date-m.last_action_on quiet_days,m.last_client_update,
 (select min(d.due_on) from deadlines d where d.matter_id=m.id and d.done_on is null) next_due,
 (select count(*)::int from evidence e where e.matter_id=m.id and e.required and e.verified_on is null) evidence_gaps
from matters m join clients c on c.id=m.client_id left join advisers a on a.id=m.adviser_id;
create view deadline_queue as
select d.id,d.name,m.name matter,c.name client,d.kind,d.due_on,d.due_on-current_date days_left,
 coalesce(a.name,'UNASSIGNED') adviser,d.source_ref
from deadlines d join matters m on m.id=d.matter_id join clients c on c.id=m.client_id left join advisers a on a.id=m.adviser_id
where d.done_on is null and m.status='open';
create view evidence_queue as
select e.id,e.name,m.name matter,c.name client,e.due_on,e.received_on,e.verified_on,e.file_ref,e.original_held,e.returned_on
from evidence e join matters m on m.id=e.matter_id join clients c on c.id=m.client_id
where m.status='open' and e.required and e.verified_on is null;
create view fee_balances as
select f.id,f.name,m.name matter,c.name client,f.currency,f.amount,f.paid,f.amount-f.paid balance,f.due_on,
 greatest(current_date-f.due_on,0) overdue_days,f.invoice_ref,f.receipt_ref
from fees f join matters m on m.id=f.matter_id join clients c on c.id=m.client_id where f.amount>f.paid;
create view retention_register as
select id,name,jurisdiction,status,last_action_on,closed_on,archive_until,
 case when jurisdiction='AU' then (last_action_on+interval '7 years')::date
 when closed_on is not null then (closed_on+interval '7 years')::date end required_until
from matters;
