# Changelog

All notable changes to `@smsmasivos/mcp-server` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-04-27

First stable release. Contains breaking changes vs. 0.4.x.

### Added — 10 new tools

- **Agendas CRUD:** `create_agenda`, `rename_agenda`, `delete_agenda`, `find_agenda` (GET).
- **Contacts:** `update_contact`, `duplicate_contact`.
- **Webhooks:** `manage_webhook` with `action` discriminator (`list` / `add` / `toggle` / `delete`). URLs must be `https://`; private IPs and localhost are rejected.
- **Reports:** `generate_report` (sync, 5 min timeout, ≤7 day range cap), `get_report_details` (fast aggregates by `campaign_id`).
- **Operations:** `send_payment_request`.

### Added — infra

- `api-client.ts`: per-call `{ timeout, method }` options. Backward-compatible third arg.
- GET method support: serializes params as querystring and preserves `source=mcp` for `type_method=43` tracking.
- New reusable Zod schema `webhookUrl` (https-only, rejects private IPs / loopback / IPv6 link-local).
- Eval suite scaffolding under `test/eval/` (run with `npm run test:eval`, requires `ANTHROPIC_API_KEY`).
- Regression test suite under `test/regression/` (Iron Rule: tools dropeadas no se re-registran por error).

### Removed (BREAKING)

- `register_loyalty_sale` — removed because `/loyalty/sale` lacks `idempotency_key`.
  Network retry could double-register stamps. Reintroduce when API supports idempotency.

### Tool count

- v0.4.x: 19 tools
- v1.0.0: **27 tools** (–1 dropped, +9 new; `manage_webhook` consolidates 4 ops in 1 tool)

### Migration

If your integration called `register_loyalty_sale`:
- Use the web panel for now, or
- Call the REST API directly with your own idempotent retry logic.

---

## [0.4.1] — 2026-04-15

- Bumped version to publish bug fixes from QA testing on npm.

## [0.4.0] — 2026-04-15

- Added input validation to all tool schemas.
- Bug fixes from QA testing: sandbox `verify_phone`, loyalty schema, error messages, end_date range.

## [0.3.x] — 2026-04-08

- Phase 2: 19 tools, FAQ resources, prompts, telemetry.
- Loyalty and wallet tools added.

## [0.2.x] — 2026-04-07

- Phase 2 start: `list_campaigns` tool, `check_verification` error handling.

## [0.1.0] — 2026-04-04

- Initial release. 8 tools (Phase 1 MVP): SMS sending, balance, agendas, contacts, campaigns, OTP verification.
