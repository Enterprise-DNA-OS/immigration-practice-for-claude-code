-- Fictional practice; dates move with the demo day. Never seed a live practice.
BEGIN;
insert into clients (id,name,email,nationality) values
('00000000-0000-4000-8000-000000000001','Maya Patel','maya@example.test','India'),
('00000000-0000-4000-8000-000000000002','Daniel Wong','daniel@example.test','Malaysia'),
('00000000-0000-4000-8000-000000000003','Amara Okafor','amara@example.test','Nigeria'),
('00000000-0000-4000-8000-000000000004','Sofia Garcia','sofia@example.test','Spain'),
('00000000-0000-4000-8000-000000000005','Maya Singh','singh@example.test','India')
on conflict do nothing;
insert into advisers (id,name,jurisdiction,licence_number,licence_expires) values
('00000000-0000-4000-8000-000000000010','Alex Morgan','AU','DEMO-AU-ONLY',current_date+180),
('00000000-0000-4000-8000-000000000011','Hana Reid','NZ','DEMO-NZ-ONLY',current_date-3)
on conflict do nothing;
insert into matters (id,name,client_id,adviser_id,jurisdiction,visa_type,opened_on,last_action_on,last_client_update,agreement_ref,agreement_on,fee_basis,licence_evidence_ref) values
('00000000-0000-4000-8000-000000000020','MM-1001','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000010','AU','482 Skills in Demand',current_date-90,current_date-35,current_date-40,'',null,'',''),
('00000000-0000-4000-8000-000000000021','MM-1002','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000010','AU','820 Partner',current_date-60,current_date-2,current_date-2,'demo/agreement-wong.pdf',current_date-60,'Fixed fee, staged invoices','demo/licence-au.pdf'),
('00000000-0000-4000-8000-000000000022','MM-1003','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000011','NZ','Accredited Employer Work Visa',current_date-50,current_date-18,current_date-20,'demo/agreement-okafor.pdf',current_date-50,'Fixed scope',''),
('00000000-0000-4000-8000-000000000023','MM-1004','00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000010','AU','500 Student',current_date-30,current_date-1,current_date-1,'demo/agreement-garcia.pdf',current_date-30,'Fixed fee','demo/licence-au.pdf')
on conflict do nothing;
insert into applications (id,name,matter_id,status,reference,lodged_on,copy_ref) values
('00000000-0000-4000-8000-000000000030','APP-1001','00000000-0000-4000-8000-000000000020','preparing','',null,''),
('00000000-0000-4000-8000-000000000031','APP-1002','00000000-0000-4000-8000-000000000021','lodged','DEMO-TRN-002',current_date-20,'demo/wong-application.pdf'),
('00000000-0000-4000-8000-000000000032','APP-1003','00000000-0000-4000-8000-000000000022','lodged','DEMO-INZ-003',current_date-25,''),
('00000000-0000-4000-8000-000000000033','APP-1004','00000000-0000-4000-8000-000000000023','preparing','',null,'')
on conflict do nothing;
insert into deadlines (id,name,matter_id,kind,due_on,source_ref) values
('00000000-0000-4000-8000-000000000040','Visa ends','00000000-0000-4000-8000-000000000020','visa-expiry',current_date+12,'demo/grant-patel.pdf'),
('00000000-0000-4000-8000-000000000041','Department evidence request','00000000-0000-4000-8000-000000000021','response',current_date-2,'demo/rfi-wong.pdf'),
('00000000-0000-4000-8000-000000000042','Medical evidence review','00000000-0000-4000-8000-000000000022','review',current_date+5,'demo/checklist-okafor.pdf'),
('00000000-0000-4000-8000-000000000043','Passport review','00000000-0000-4000-8000-000000000023','passport',current_date+40,'demo/passport-garcia.pdf')
on conflict do nothing;
insert into evidence (id,name,matter_id,due_on,received_on,verified_on,file_ref,original_held) values
('00000000-0000-4000-8000-000000000050','Employer nomination letter','00000000-0000-4000-8000-000000000020',current_date-5,null,null,'',false),
('00000000-0000-4000-8000-000000000051','Relationship statement','00000000-0000-4000-8000-000000000021',current_date-3,current_date-4,null,'demo/relationship.pdf',false),
('00000000-0000-4000-8000-000000000052','Passport original','00000000-0000-4000-8000-000000000022',current_date-10,current_date-12,current_date-11,'demo/passport-okafor.pdf',true),
('00000000-0000-4000-8000-000000000053','Enrolment evidence','00000000-0000-4000-8000-000000000023',current_date+10,current_date-1,current_date-1,'demo/coe.pdf',false)
on conflict do nothing;
insert into notes (id,name,matter_id,happened_on,kind,author,body,confirmed_ref) values
('00000000-0000-4000-8000-000000000060','Employer call','00000000-0000-4000-8000-000000000020',current_date-35,'oral','Alex Morgan','Employer will supply nomination letter. Confirmation still required.',''),
('00000000-0000-4000-8000-000000000061','Client update','00000000-0000-4000-8000-000000000021',current_date-2,'client-update','Alex Morgan','Explained response evidence still awaits verification.','demo/update-wong.eml')
on conflict do nothing;
insert into fees (id,name,matter_id,currency,amount,paid,due_on,invoice_ref,receipt_ref) values
('00000000-0000-4000-8000-000000000070','INV-1001','00000000-0000-4000-8000-000000000020','AUD',3200.00,800.00,current_date-21,'demo/invoice-1001.pdf','demo/receipt-1001.pdf'),
('00000000-0000-4000-8000-000000000071','INV-1003','00000000-0000-4000-8000-000000000022','NZD',2100.00,0,current_date-4,'demo/invoice-1003.pdf','')
on conflict do nothing;
COMMIT;
