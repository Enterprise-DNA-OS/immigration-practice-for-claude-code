# Move records from Migration Manager

The vendor confirms that [custom reports export to Excel](https://www.migrationmanager.com.au/features/) (checked 28 September 2026). Reports have user-selected columns. A fixed, universal export schema is not documented in the sources checked. The supplied fixtures are our interchange examples, not captured vendor exports.

1. In Migration Manager, create custom reports containing the records you need and export them to Excel. Preserve an untouched copy. Include stable client and matter identifiers. Obtain document files and correspondence separately through your authorised archive process.
2. Map headings to the contract below and save each report as UTF-8 CSV. Dates must be YYYY-MM-DD. Do not guess missing dates, statuses or references. Mapping is part of Enterprise DNA's migration work, or ask your coding agent to map a sample first.
3. Start an empty database with `npm run migrate`. Do not load the demo into your real practice.
4. Preview then apply the whole folder:

```bash
npm run immigration -- import migration-manager ./my-reports --json
npm run immigration -- import migration-manager ./my-reports --apply --json
```

Preview executes validation and rolls back all writes, including audit and import records. Apply is one transaction. A failed row rolls back the whole folder. Repeat imports skip identical source rows without overwriting later local changes. Changed source rows fail for deliberate reconciliation.

## Files and columns

Every CSV requires a unique `source_id` and the field names below. Unknown columns fail instead of silently disappearing. Omit empty optional columns. The `help --json` result lists every supported field. The folder is processed in this order:

| File | Required columns beyond source_id | Other supported fields |
| --- | --- | --- |
| clients.csv | name | email, nationality |
| advisers.csv | name, jurisdiction, licence_number, licence_expires | none |
| matters.csv | name, client_source_id, jurisdiction, visa_type | adviser_source_id, opened_on, agreement_ref, agreement_on, fee_basis, licence_evidence_ref, archive_until |
| applications.csv | name, matter_source_id | copy_ref |
| deadlines.csv | name, matter_source_id, kind, due_on, source_ref | none |
| evidence.csv | name, matter_source_id | required, due_on, received_on, verified_on, file_ref, original_held, returned_on, return_ref |
| notes.csv | name, matter_source_id, kind, author, body | happened_on, confirmed_ref |
| fees.csv | name, matter_source_id, currency, amount, due_on, invoice_ref | paid, receipt_ref |

Matter and client references must resolve to rows in the supplied folder, including previously imported rows supplied again. Names do not serve as import identifiers. `true` and `false` are the only CSV booleans. Amounts are nonnegative decimal strings with at most two decimal places. Currencies stay separate.

## Reconcile before switching

Compare counts, client/matter links, all outstanding deadlines and fee totals by currency. Open each source notice and check its recorded date. The import creates open matters and preparing applications deliberately. Record historical lodgements and decisions with the dedicated commands after reviewing evidence and agreements. No history is silently claimed complete.

Attachments, government forms, portal accounts, passwords, VEVO results, automated mail capture, template libraries, existing closed statuses, trust records and payment feeds do not move through this importer. Document references are not document files. Preserve the original archive and link the required records. Run `compliance`, `key-dates`, `evidence-chase` and `originals-return`, then compare both systems before retiring the old one.

Export your complete structured database, including audit and import records:

```bash
npm run immigration -- export ./exports/practice.json
```

This creates a new JSON snapshot and refuses to overwrite a file. It is portable data, not an automatic restore command. Use normal database backups for disaster recovery and retain the referenced document archive separately.
