# Immigration Practice for Claude Code

Visa dates, evidence, client files and the Monday review in a database you own. Built by Enterprise DNA. MIT licence.

| Do it yourself | We customise it | We run it for you |
| --- | --- | --- |
| Free source. Follow the quick start. | Your fields, rules, reports, data migration and a web interface or different stack if needed. | Installed, connected and operated through Omni by Enterprise DNA. One setup fee, then a retainer. |

[Talk to Sam](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=migration-manager&utm_medium=readme) · [Instead of Migration Manager](https://enterprisedna.co/omni/instead-of/migration-manager?utm_source=github&utm_medium=readme&utm_campaign=migration-manager)

Works with Claude Code, Codex, OpenCode or Cursor. Read AGENTS.md and CLAUDE.md.

## Quick start

```bash
git clone https://github.com/Enterprise-DNA-OS/immigration-practice-for-claude-code.git
cd immigration-practice-for-claude-code
npm install
npm run demo
npm run immigration -- attention
npm run view
npm run docs
```

Node 20 or newer. No separate database install is needed. The demo has five fictional clients, four matters across AU and NZ, a visa expiry twelve days away on a quiet file, an overdue evidence request, an expired adviser licence, an unreturned original and fee balances in two currencies. Example document references identify fictional files, not real attachments. The seed is repeatable without replacing existing records.

For real work, use a new DATA_DIR or a practice-managed DATABASE_URL, run npm run migrate, and import your mapped reports. Never load the demo into a real practice. The same migrations run on PGlite and Postgres without extensions.

## The week's work

- `/clients`: List the client register.
- `/advisers`: Check adviser assignments and recorded licence dates.
- `/matters`: Review the open matter board.
- `/matter`: Read a complete client matter.
- `/applications`: Review preparation, lodgement and decisions.
- `/key-dates`: Check every open recorded deadline.
- `/visa-expiries`: Review recorded visa expiries within sixty days.
- `/evidence-chase`: Chase missing or unverified evidence.
- `/client-updates`: Find overdue client updates.
- `/fee-balances`: Review outstanding practice fees by currency.
- `/originals-return`: Check original documents still held.
- `/retention`: Review retention floors and archive dates.
- `/workload`: Review adviser workload and evidence gaps.
- `/attention`: Prioritise overdue dates, quiet files and evidence.
- `/compliance`: Review the cited file checks.
- `/weekly-review`: Write the Monday practice review from current records.
- `/add`: Add a validated record.
- `/update`: Update an existing record with an audit entry.
- `/log`: Record a material conversation or completed client update.
- `/complete-deadline`: Record completion with evidence.
- `/record-lodgement`: Record a lodgement already performed outside this system.
- `/record-decision`: Record an actual received decision.
- `/close-matter`: Close a finished matter and set its retention review.
- `/draft-client-update`: Draft a client update for adviser review.
- `/draft-evidence-request`: Draft an evidence request for adviser review.
- `/import`: Preview and import mapped Migration Manager reports.
- `/export`: Export all structured records to a new snapshot.
- `/customise`: add a field, change a rule, write and test a migration.
- `/new-view`: add a branded read-only dashboard.

Every CLI command accepts --json. Names match without case sensitivity and unique name fragments or UUID prefixes work. Ambiguous matches list candidates and exit 1. UUIDs are used for relationships in write JSON. `help --json` lists allowed fields.

### Record a conversation

```bash
npm run immigration -- log MM-1001 '{"name":"Employer evidence call","kind":"oral","author":"Alex Morgan","body":"Employer will supply the nomination letter.","happened_on":"2026-09-28"}'
```

In Windows PowerShell, quote JSON according to your shell or ask the coding agent to call the CLI with an argument array. Tests use Node argument arrays and run on Linux and Windows in CI.

The CLI wraps writes in transactions. Audit entries capture before and after values. Ordinary notes cannot be edited. Import preview rolls back everything, duplicate source rows are skipped, and changed source records stop for reconciliation. Database administrators can change database contents, so the local audit trail is not tamper-proof.

## File checks and documents

`/compliance` checks recorded agreement evidence, application copies, invoices and receipts, NZ written confirmations and licence evidence, and jurisdiction-specific retention floors. It also flags recorded adviser expiry or assignment gaps. Every legal check links to OMARA or IAA in [docs/compliance.md](docs/compliance.md). The checks identify record gaps, not legal compliance or visa eligibility.

`record-lodgement` records a submission already made elsewhere. It requires the agreement, fee basis, verified required evidence and an eligible recorded adviser assignment. It never contacts a government system. Closing refuses unfinished applications, open deadlines or unreturned originals and sets a seven-year retention review floor.

`npm run docs` produces draft client status reports, evidence requests, file indexes and practice fee statements. `npm run view` produces the week, fee balances and retention review as read-only HTML. All use brand.json. References to documents do not embed those documents. Output remains local for review.

## Ten questions to ask across your practice

Migration Manager supports custom reports. These are ten cross-record questions answered by this CLI today, not a claim that its reporting cannot be configured to answer them.

1. Which visa expiries are close while the matter has been quiet? (`visa-expiries + matters`)
2. Which requested evidence is overdue and who owns its matter? (`evidence-chase + matters`)
3. Which received documents still need verification? (`evidence-chase`)
4. Which advisers have the most quiet files and evidence gaps? (`workload`)
5. Which clients have no recent recorded update? (`client-updates`)
6. Which original documents still need a recorded return? (`originals-return`)
7. Which lodged applications lack a copy reference? (`compliance`)
8. Which files have archive dates shorter than the recorded retention floor? (`compliance + retention`)
9. Which practice fees are overdue, keeping AUD and NZD separate? (`fee-balances`)
10. What transfers to another adviser when a matter changes hands? (`matter + workload`)

## Your first hour: ten things to ask for

1. Put our name, logo and colours on the reports.
2. Add our advisers and their recorded licence expiry dates.
3. Add our visa and matter categories.
4. Add a source-notice reference to our document checklist.
5. Change our client-update policy from fourteen days to seven.
6. Add a supervising adviser field.
7. Map our Migration Manager report headings.
8. Add a report for one adviser's Monday meeting.
9. Add our firm's evidence-request wording.
10. Add an internal review date before every response deadline.

Use `/customise` for changes. Migrations, validation, reports and tests move together.

## Switching and limits

[The replace guide](docs/replace-migration-manager.md) explains the one-command import of mapped CSV reports saved from Migration Manager's Excel exports, what maps and what remains outside the import. Preserve original documents and reconcile every deadline before switching.

No client portal, email capture, VEVO integration, government form filling, maintained legal template library, trust ledger or payment processing is included. [Why no front end](docs/why-no-front-end.md) describes mobile, offline, collaboration and database-access limits. Professional decisions stay with the adviser.

## Validation

```bash
npm test
npm run demo
```

The tests create a temporary database, migrate and seed twice, exercise every CLI command, verify write gates, imports, rollback, audit, monetary precision, HTML escaping and JSON output, and remove their temporary data. CI runs the same test on Windows and Linux. Set TEST_DATABASE_URL only to a disposable test database for the Postgres route.

## Architecture and operation

- supabase/migrations/: versioned SQL and reusable views.
- scripts/immigration.mjs: one CLI for the practice.
- scripts/lib/domain.mjs: validation, matching and file checks.
- scripts/lib/import.mjs: transactional report import.
- .claude/commands/: recurring workflows for every runtime.
- views.json and documents.json: printable outputs in your brand.
- docs/: compliance sources, import contract and operating boundaries.

Back up the database and referenced document archive together. Keep database credentials private, limit shared access and test restores. The free base has no login or per-client permissions layer. Agent subscriptions and hosting are separate from the free source licence.

Built with Codex using the Enterprise DNA rebuild template. Contributions should preserve the single CLI, cited rules, draft-only documents and no-front-end shape.

MIT. Copyright 2026 Enterprise DNA.
