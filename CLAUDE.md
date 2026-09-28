# Immigration Practice for Claude Code

## Who this is for

Harbour Immigration Practice is fictional demo data. Replace this paragraph with the operator's firm, jurisdiction, role and weekly priorities before real use. The base serves AU registered migration agents and NZ licensed immigration advisers. It does not decide eligibility or provide immigration advice.

## Rules

Read records before answering. One CLI: `npm run immigration -- help --json`. Never invent records or infer missing legal dates. Ambiguous matches list candidates and exit 1. Commands live in `.claude/commands/` and apply equally to Claude Code, Codex, OpenCode and Cursor.

Nothing sends, lodges, runs VEVO, takes money or holds trust funds. Record a government submission only after the adviser has performed it elsewhere and supplied its reference. Every letter is a draft for adviser review. Preserve source notices and complete document files in secure storage.

Use the CLI for ordinary changes so checks and audit events run. Notes are append-only. Never bypass a failed write with direct SQL. No deletion command exists. Retention review dates do not authorise destruction. Migrations are numbered and tested in isolation first.

## Routes

- List the client register: `/clients`.
- Check adviser assignments and recorded licence dates: `/advisers`.
- Review the open matter board: `/matters`.
- Read a complete client matter: `/matter`.
- Review preparation, lodgement and decisions: `/applications`.
- Check every open recorded deadline: `/key-dates`.
- Review recorded visa expiries within sixty days: `/visa-expiries`.
- Chase missing or unverified evidence: `/evidence-chase`.
- Find overdue client updates: `/client-updates`.
- Review outstanding practice fees by currency: `/fee-balances`.
- Check original documents still held: `/originals-return`.
- Review retention floors and archive dates: `/retention`.
- Review adviser workload and evidence gaps: `/workload`.
- Prioritise overdue dates, quiet files and evidence: `/attention`.
- Review the cited file checks: `/compliance`.
- Write the Monday practice review from current records: `/weekly-review`.
- Add a validated record: `/add`.
- Update an existing record with an audit entry: `/update`.
- Record a material conversation or completed client update: `/log`.
- Record completion with evidence: `/complete-deadline`.
- Record a lodgement already performed outside this system: `/record-lodgement`.
- Record an actual received decision: `/record-decision`.
- Close a finished matter and set its retention review: `/close-matter`.
- Draft a client update for adviser review: `/draft-client-update`.
- Draft an evidence request for adviser review: `/draft-evidence-request`.
- Preview and import mapped Migration Manager reports: `/import`.
- Export all structured records to a new snapshot: `/export`.
- Change fields or policies: `/customise`.
- Add a printable dashboard: `/new-view`.

## Storage

PGlite in .data/db is for one local operator. DATABASE_URL selects shared Postgres. Do not seed production. npm test uses a temporary database and output folder. Brand, views and documents are configured in brand.json, views.json and documents.json. Keep drafts, exports, database files and secrets out of Git.

Omni by Enterprise DNA: https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=migration-manager&utm_medium=readme
