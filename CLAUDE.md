# Family Guardian — B2B (`fg-b2b`)

> **Read this first.** It's the contract for how to work in this repo. If you're a future Claude session, follow the rules below before touching any code. If you're a human engineer, skim it; the deep-dive references live in `/docs`.

---

## What This Product Is

Family Guardian B2B delivers AI-powered daily check-in calls to high-risk patients on behalf of risk-bearing healthcare buyers. Each call is placed by a voice agent, transcribed, analyzed for clinical/cognitive/safety signals, and surfaced to the buyer's care team with severity-graded alerts. Outcome reports tie call signal to the buyer's contractual quality metric (e.g., 30-day readmissions for an ACO, Stars for an MA plan).

**Anchor pilot:** Palm Beach ACO (PBACO). Top five conditions: CHF, COPD, pneumonia, AMI, post-surgical recovery.

The B2C version of this product (families pay $299/month) is a separate codebase. Architecture in this repo (multi-tenancy, buyer-typed cohorts, contractual outcome metrics) is **not** compatible with the B2C model. Don't copy patterns blindly from the B2C app.

---

## The Buyer Landscape

Five tenant types, each with a different cohort definition and outcome metric. Stored as `tenants.type` enum + `tenants.cohort_definition` and `tenants.outcome_metrics` jsonb. See [`docs/buyers.md`](./docs/buyers.md) for the per-type playbook.

| Type              | Buyer                                           | Their cohort                             | Their outcome metric                  |
| ----------------- | ----------------------------------------------- | ---------------------------------------- | ------------------------------------- |
| `aco`             | Accountable Care Organization (PBACO is anchor) | Risk-stratified Medicare lives           | 30-day readmission rate               |
| `ma_plan`         | Medicare Advantage payer                        | High-risk MA members                     | Stars rating + HEDIS gap closure      |
| `physician_group` | Risk-bearing primary care group                 | Panel patients flagged by EHR risk score | Acute utilization, no-show rate       |
| `home_health`     | HHA agency                                      | Active home-health episodes              | Acute transfer avoidance              |
| `snf`             | Skilled nursing facility                        | Recently discharged residents            | 30-day rehospitalization, ED revisits |

Family-in-the-loop access is **deferred** from V1 — different buyer types may already maintain their own family contact lists. Decision pending; documented in [`docs/buyers.md`](./docs/buyers.md).

---

## Tech Stack & Why

- **Monorepo: pnpm workspaces + Turborepo 2.** Workspace deps via `workspace:*` resolve to source TS — no build step inside packages, apps consume via `transpilePackages` in `next.config.mjs`.
- **Apps: Next.js 14 App Router, TypeScript strict.** Two apps in this repo: `care-team-web` (the buyer-facing console, port 3000) and `marketing-web` (landing/investor site, port 3001).
- **Database: Supabase Postgres.** Row-level multi-tenancy via `tenant_id` column + RLS policies referencing helper SQL functions. Local dev uses Docker (`pnpm db:start`); production lives in a Supabase cloud project per environment.
- **Auth: Supabase Auth.** Roles split: a global `is_super_admin` flag on `user_profiles`, plus per-tenant role on `user_tenant_memberships` (`tenant_admin | care_team_lead | care_team_member`).
- **Voice: provider-agnostic.** All telephony goes through `@fg/voice`. **Retell** is the planned first concrete implementation (HIPAA, verified caller ID, ~600ms latency). VAPI, ElevenLabs+Twilio DIY, and LiveKit have stubbed providers behind the same interface so we can swap later.
- **LLM analysis: provider-agnostic, Claude default.** All transcript analysis goes through `@fg/analysis`. Default impl is `ClaudeAnalysisProvider` against `claude-sonnet-4-6`.
- **Tests: Vitest (unit) + Playwright (e2e).** Installed and configured in foundation; first tests land alongside the first real feature.
- **CI: GitHub Actions.** Runs `pnpm install + lint + typecheck + test` on every PR.
- **Hooks: Husky 9 + lint-staged + commitlint.** Pre-commit formats staged TS/JSON/MD; commit-msg enforces Conventional Commits.

---

## Monorepo Layout

```
apps/
  care-team-web/        # Next 14 — buyer-facing care console (port 3000)
  marketing-web/        # Next 14 — landing/investor site (port 3001)
packages/
  types/                # @fg/types — shared TS types matching DB schema
  database/             # @fg/database — Supabase clients + generated DB types
  auth/                 # @fg/auth — auth helpers, role guards
  ui/                   # @fg/ui — shadcn primitives + tailwind preset
  voice/                # @fg/voice — VoiceProvider interface + 4 stubs
  analysis/             # @fg/analysis — AnalysisProvider interface + Claude impl
supabase/
  migrations/           # SQL migrations (timestamped)
  seed.sql              # 1 PBACO tenant; never seed PHI
docs/                   # Architecture, DB, buyers, security, ADRs
```

**Hard rule:** apps depend on packages; packages never depend on apps. A package can depend on other packages (e.g. `@fg/auth` → `@fg/database` → `@fg/types`), but the dependency graph must stay acyclic.

---

## Database Conventions

- **Every domain table has `tenant_id`.** No exceptions for V1. If you're tempted to add a table without it, ask whether it should live outside `public.*`.
- **Audit columns on every table:** `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`, `deleted_by`. Soft delete only — never `delete from`. The `set_updated_at()` trigger maintains `updated_at`.
- **RLS enabled AND forced on every table.** `force` means even table owners hit the policies; only roles with `BYPASSRLS` (Supabase's `service_role`) skip them. Never write app-side queries that assume RLS off.
- **Policies route through helpers.** Three helper SQL functions:
  - `auth_user_tenants() → setof uuid` — tenant_ids the calling auth.uid() is an active member of
  - `auth_user_is_super_admin() → boolean`
  - `auth_user_role_in_tenant(tenant_id) → membership_role`
    All are `security definer` with fixed `search_path = public` so they bypass RLS during policy evaluation.
- **System writes go through `service_role`.** Call ingestion, transcript analysis, alert generation, scheduled jobs — all use `createServiceRoleClient` from `@fg/database`. User-facing code uses anon/authenticated.
- **Schema changes are migrations, never edits.** New SQL file under `supabase/migrations/<timestamp>_<name>.sql`. Run `pnpm db:reset` locally to verify, `pnpm db:types` to regenerate `packages/database/src/generated.ts`, then commit both.
- **Conditions are `text[]` short-codes** (`'chf'`, `'copd'`, …) for now. ICD-10 mapping is deferred; document any change in an ADR before migrating.

See [`docs/database.md`](./docs/database.md) for the schema rationale and the row-vs-schema-per-tenant decision.

---

## Voice Provider Abstraction

Never import `Retell`, `VAPI`, `Twilio`, `ElevenLabs`, or `LiveKit` SDKs directly from product code. Always:

```ts
import { getVoiceProvider } from '@fg/voice';

const voice = getVoiceProvider(); // reads VOICE_PROVIDER env, defaults to 'retell'
await voice.placeOutboundCall({ toNumber, tenantId, patientId, agentId, metadata });
```

`VoiceProvider` interface methods:

- `placeOutboundCall(req)` — enqueue an outbound call
- `endCall(providerCallId)` — terminate
- `getCallStatus(providerCallId)` — poll status
- `parseInboundWebhook(headers, body)` — normalize provider webhook to `InboundWebhookEvent`

All four implementations exist as stubs; only Retell will be wired first per the plan (Session 3+). When you wire one, _do not_ leak provider-specific types into product code — convert at the abstraction boundary.

---

## Analysis Abstraction

Same rule: never call `@anthropic-ai/sdk` directly from product code.

```ts
import { ClaudeAnalysisProvider } from '@fg/analysis';
import Anthropic from '@anthropic-ai/sdk';

const analysis = new ClaudeAnalysisProvider({ client: new Anthropic() });
const result = await analysis.analyzeTranscript(transcript, context);
```

`CallAnalysis` and `AnalysisContext` shapes live in `@fg/types`. If you change them, change the schema and the prompt template together — they're a contract.

---

## Coding Rules Claude Must Follow

- **Strict TypeScript.** No `any` unless documented. The repo has `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` on; respect them.
- **No `console.log` in committed code.** Use a logger when one exists; for now, throw or return.
- **Conventional Commits, enforced.** Format: `type(scope): subject`. Allowed types: `feat | fix | chore | docs | refactor | test | ci | build | perf | style | revert`.
- **Never bypass RLS in product code.** If you need a query that can't go through user-context auth, use the service-role client and document why.
- **Never commit secrets.** `.env` is gitignored. Real values go in `.env.local`. See [`docs/secrets.md`](./docs/secrets.md).
- **Prefer editing files to creating them.** Don't create `Foo.v2.ts` next to `Foo.ts`.
- **No comments unless WHY is non-obvious.** Skip narration. `// Retell is the planned first impl per plan D12` is fine; `// loop over patients` is not.
- **No `.js` suffixes in internal imports.** `from './foo'` not `from './foo.js'` — Next's webpack doesn't follow `.js → .ts` rewrites without extra config, and we'd rather keep code portable.
- **Plan-mode discipline for non-trivial work.** Multi-step features get a plan in `~/.claude/plans/` first, then execution.

---

## What Is Built / What Is Not Built

Updated at the end of every session.

### Built (Session 1 — foundation)

- ✅ Monorepo: pnpm workspaces, Turborepo 2, TS strict, ESLint flat, Prettier, Husky + commitlint, lint-staged
- ✅ Six packages scaffolded with workspace linking: `@fg/types`, `@fg/database`, `@fg/auth`, `@fg/ui`, `@fg/voice`, `@fg/analysis`
- ✅ Two apps: `care-team-web` (placeholder Card/Button page), `marketing-web` (placeholder landing)
- ✅ Supabase: local Docker stack, initial migration applied, 10 tables with RLS enabled+forced, PBACO seed, generated TS types
- ✅ Voice abstraction: 4 stubbed providers (Retell, VAPI, ElevenLabs+Twilio, LiveKit), env-driven factory
- ✅ Analysis abstraction: ClaudeAnalysisProvider stubbed against `claude-sonnet-4-6`
- ✅ Auth helpers: `requireUser`, `requireSuperAdmin`, `requireRole(tenantId, minRole)`
- ✅ shadcn primitives in `@fg/ui`: Button + Card variants, Tailwind preset shared by both apps
- ✅ GitHub Actions CI: lint + typecheck + test on PRs
- ✅ Docs: `architecture.md`, `database.md`, `buyers.md`, `security.md`, `secrets.md`, ADR-0001

### Not Built

- ❌ Auth flow (login, tenant switcher) — Session 2
- ❌ Any working voice call — providers all stub
- ❌ Any working analysis call — Claude provider stub
- ❌ Care-team dashboards (calls, alerts, patients, trends, settings)
- ❌ Outbound call scheduler / cron jobs
- ❌ Webhook receivers (`/api/webhooks/retell` etc.)
- ❌ Alert engine + escalation chain
- ❌ Outcome reporting layer
- ❌ Family-in-the-loop access (deferred per Session 1 plan, Q2)
- ❌ Stripe / billing
- ❌ Sentry / observability
- ❌ HIPAA BAAs, SOC 2 controls (CTO scope)
- ❌ Real tests (Vitest + Playwright installed only)
- ❌ Production Supabase project (local Docker only)

---

## Commands

| Command          | What it does                                                  |
| ---------------- | ------------------------------------------------------------- |
| `pnpm install`   | Install all workspace deps                                    |
| `pnpm dev`       | Run both apps in parallel (care-team:3000, marketing:3001)    |
| `pnpm build`     | Production build of both apps                                 |
| `pnpm lint`      | ESLint across all workspaces                                  |
| `pnpm typecheck` | `tsc --noEmit` across all workspaces                          |
| `pnpm test`      | Vitest across all workspaces (passes with no tests)           |
| `pnpm test:e2e`  | Playwright across apps                                        |
| `pnpm format`    | Prettier write across the repo                                |
| `pnpm db:start`  | Spin up local Supabase Docker stack                           |
| `pnpm db:stop`   | Stop local Supabase                                           |
| `pnpm db:reset`  | Recreate local DB and reapply all migrations + seed           |
| `pnpm db:diff`   | Generate a migration from current local DB drift              |
| `pnpm db:types`  | Regenerate `packages/database/src/generated.ts` from local DB |

Local Supabase URLs after `db:start`:

- API: http://127.0.0.1:54321
- Studio: http://127.0.0.1:54323
- DB: postgresql://postgres:postgres@127.0.0.1:54322/postgres
- Inbucket (email): http://127.0.0.1:54324
