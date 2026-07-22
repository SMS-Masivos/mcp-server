# Changelog

All notable changes to `@smsmasivos/mcp-server` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] — 2026-07-22

Major — **breaking**. Se reemplazan las 4 tools OTP v1 por las 4 tools OTP v2, alineadas con el backend `/v2/otp` (`api/controllers/controller.verificationv2.php`) y la documentación oficial (`api-docs/docs/otp.mdx`). El conteo total de tools se mantiene en **30**.

### Removed (breaking)

- Tools OTP v1: `verify_phone`, `check_verification`, `resend_verification`, `reset_verification` (llamaban a `/protected/json/phones/verification/{start,check,resend,reset}`, deprecados). Prompts/automatizaciones que las invoquen por nombre dejarán de resolver — migrar a las tools v2.

### Added

- **`send_otp`** → `POST /v2/otp`. Punto único: crea, reenvía el mismo código (cooldown 30s), cambia de canal (`sms`/`whatsapp`/`voice`) o rota (`code_rotate: true`). Reemplaza a `verify_phone` + `resend_verification` + `reset_verification`.
- **`verify_otp`** → `POST /v2/otp/verify`. Valida el `code` (antes `verification_code`). Reemplaza a `check_verification`.
- **`get_otp_status`** → `GET /v2/otp/status`. Estado read-only, sin efectos secundarios. Nuevo.
- **`delete_otp`** → `DELETE /v2/otp`. Invalida la verificación activa sin enviar nada. Nuevo.
- `api-client`: modo `raw` (status-aware) + soporte `DELETE`. La v2 usa HTTP status reales (401 código incorrecto, 402 saldo, 404/409/410/429 estados); en modo `raw` el cliente devuelve `{status, body}` sin mapear 401→AuthError ni reintentar en 429. El camino no-raw (las otras 26 tools) queda intacto.
- Tests: `test/api-client-raw.test.ts` (6 casos del modo raw). Total suite: 94 tests.

### Changed

- Tabla de equivalencias v1→v2 documentada en `api-docs/docs/otp.mdx`.
- `README.md`, `package.json` (description), `src/prompts/index.ts`, `src/resources/faq.ts`: actualizados a los nombres y contrato v2 (expiración default 24h, 7 intentos por código).

## [1.1.2] — 2026-06-01

Patch — docs + housekeeping. Sin cambios de código de tools (`dist` idéntico).

### Changed

- **Conteo de tools corregido: 29 → 30.** El total estaba off-by-one desde v1.0.0 (el CHANGELOG de 1.0.0 contó "+9 nuevas" cuando la Fase 4 agregó 10 tools). El registro real en `src/tools/index.ts` tiene **30 tools** (incluye `get_metrics`). Corregido en `package.json` (description) y `README.md` (header).
- `README.md`: documentada la paginación page-based de `find_agenda` (`page`/`limit`/`next_page`), agregada tabla de acciones de `manage_webhook`, corregido el conteo de recursos FAQ (5 → 6, consistente con `faq.ts`), y agregada sección **Publicación (mantenedores)** con el flujo `npm publish` manual + redeploy del worker.
- `CHANGELOG.md`: vinculado PR #2 en la entrada `[1.0.0]`.

### Removed

- `.github/workflows/publish-and-deploy.yml` — estaba mal nombrado (no publicaba a npm) y su único step (trigger cross-repo al worker) fallaba con **404** porque `secrets.GITHUB_TOKEN` está scoped al repo emisor. El worker auto-deploya en push a su `main` o vía `workflow_dispatch` (documentado en el README).

## [1.1.1] — 2026-04-29

Patch — README only. v1.1.0 publicó las tools `resend_verification` y `reset_verification` correctamente pero el README no las listó en la tabla "Verificación OTP". Sin cambios de código.

### Changed

- `README.md`: tabla "Verificación OTP" ahora lista las 4 tools (start, check, resend, reset).
- Header de features: "27 tools" → "29 tools" + nota explícita "OTP: start/check/resend/reset".

## [1.1.0] — 2026-04-29

Minor bump (no breaking). Completa el flujo OTP que quedó parcial en v1.0.0.

### Added — 2 new tools

- **`resend_verification`** → `POST /protected/json/phones/verification/resend`. Reenvía el código a un número con verificación activa. Por default reenvía el mismo código; con `reset_code: "1"` regenera uno nuevo. Acepta `voice`, `whatsapp`, `expiration_date`, `code_type`.
- **`reset_verification`** → `POST /protected/json/phones/verification/reset`. Limpia los intentos fallidos de una verificación. Útil cuando el usuario excedió max attempts o el código expiró. Con `reset_code: "1"` además genera un código nuevo.

### Why

El plan de Fase 4 (v1.0.0) excluyó deliberadamente estas tools como "raramente invocado por LLM". En la práctica rompen la conversación: si un user dice *"no me llegó el SMS"*, el LLM debería poder invocar `resend` directo en vez de redirigir a soporte humano.

### Tool count

- v1.0.0: 27 tools
- v1.1.0: **29 tools** (+2 OTP completion)

### Migration

Sin breaking changes. Clientes existentes funcionan sin tocar nada. Worker MCP (`mcp.smsmasivos.com.mx`) auto-pickea v1.1.0 vía caret `^1.0.0` en su `package.json` en el próximo deploy.

## [1.0.0] — 2026-04-27

First stable release. Contains breaking changes vs. 0.4.x.
Merged via [PR #2](https://github.com/SMS-Masivos/mcp-server/pull/2) (`feature/fase-4-v1.0.0` → `main`).

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
