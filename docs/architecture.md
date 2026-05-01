# Architecture

## System overview

Family Guardian B2B is a multi-tenant SaaS that places AI voice calls to high-risk patients on behalf of risk-bearing healthcare buyers, analyzes the resulting transcripts, raises alerts on concerning signals, and reports outcomes back against the buyer's contractual quality metric.

The hot path is event-driven: a scheduled cron triggers a call, the voice provider runs the conversation and posts a transcript via webhook, the analyzer writes structured signals, the alert engine compares against longitudinal baselines, and the care team acts. None of this is built yet (Session 1 is foundation only). What follows is the contract every future session implements against.

## Call lifecycle

```
            ┌──────────────────────────────┐
            │       call_schedules         │  (per patient: cadence,
            │       active=true            │   time-of-day, timezone)
            └─────────────┬────────────────┘
                          │  cron job (every minute)
                          ▼
            ┌──────────────────────────────┐
            │     CALL DISPATCHER          │  apps/care-team-web/api/cron/
            │  getVoiceProvider()          │  trigger-calls
            │   .placeOutboundCall(...)    │
            └─────────────┬────────────────┘
                          │  inserts call_logs (status=scheduled)
                          ▼
            ┌──────────────────────────────┐
            │    VOICE PROVIDER (Retell)   │  HIPAA-compliant, verified
            │  - PSTN dial                 │  caller ID, ~600ms latency
            │  - conversation engine       │
            │  - real-time transcription   │
            └─────────────┬────────────────┘
                          │  webhook (call_ended)
                          ▼
            ┌──────────────────────────────┐
            │     WEBHOOK HANDLER          │  apps/care-team-web/api/webhooks/
            │  voice.parseInboundWebhook() │  retell
            │  updates call_logs           │  (uses service-role client)
            └─────────────┬────────────────┘
                          │  enqueues analysis
                          ▼
            ┌──────────────────────────────┐
            │   TRANSCRIPT ANALYZER        │  ClaudeAnalysisProvider
            │  analyzeTranscript(t, ctx)   │  model: claude-sonnet-4-6
            │  writes call_analyses        │  ctx: last 3 summaries
            └─────────────┬────────────────┘
                          │
                          ▼
            ┌──────────────────────────────┐
            │      ALERT ENGINE            │  reads longitudinal baseline
            │  - immediate (safety)        │  writes alerts.severity
            │  - same-day (cognitive)      │  one alert per concerning
            │  - trend (3+ day decline)    │  signal, deduplicated
            └─────────────┬────────────────┘
                          │
                          ▼
            ┌──────────────────────────────┐
            │  NOTIFICATION + ESCALATION   │  SMS (Twilio) + push
            │  - critical: phone call too  │  - 30 min ack window for
            │  - high: 15 min              │    critical, then escalate
            │  - medium: 1 hour digest     │  to all care team members
            │  - low: daily digest         │  in tenant
            └─────────────┬────────────────┘
                          │
                          ▼
            ┌──────────────────────────────┐
            │    CARE TEAM ACTION          │  acknowledge | comment |
            │  writes care_team_actions    │  escalate | resolve | dismiss |
            │  updates alerts.status       │  schedule_visit | contact_patient
            └──────────────────────────────┘

            (separately, monthly/quarterly)
            ┌──────────────────────────────┐
            │  OUTCOME REPORT GENERATOR    │  per-tenant cron
            │  reads call_analyses,        │  reports against tenants.outcome_metrics
            │   alerts, patients           │  (e.g., 30-day readmits for ACO)
            │  writes outcome_reports      │
            └──────────────────────────────┘
```

## Component layout

| Layer         | Where it lives                 | What it owns                                                                                                                                                                                                         |
| ------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI            | `apps/care-team-web`           | Buyer-facing console: dashboards, alerts, patients, settings. Server components by default; client only where needed.                                                                                                |
| Marketing     | `apps/marketing-web`           | Static landing site. Zero auth.                                                                                                                                                                                      |
| API routes    | `apps/care-team-web/app/api/*` | Webhooks, cron triggers, internal endpoints. All use service-role client when bypassing user-context auth.                                                                                                           |
| Auth          | `@fg/auth`                     | Supabase server/browser client wrappers, `requireUser`, `requireRole`, `requireSuperAdmin`                                                                                                                           |
| DB access     | `@fg/database`                 | Supabase client factories, generated `Database` types from `pnpm db:types`                                                                                                                                           |
| Shared types  | `@fg/types`                    | `Tenant`, `Patient`, `CallAnalysis`, etc. — written by hand to mirror the SQL schema. The generated `Database` type is the source of truth at the row level; `@fg/types` is the source of truth at the domain level. |
| Voice         | `@fg/voice`                    | `VoiceProvider` interface + 4 stubs (Retell wired first)                                                                                                                                                             |
| Analysis      | `@fg/analysis`                 | `AnalysisProvider` interface + Claude impl                                                                                                                                                                           |
| UI primitives | `@fg/ui`                       | shadcn components + Tailwind preset shared across both apps                                                                                                                                                          |
| Schema        | `supabase/migrations/*.sql`    | All schema changes are migrations, applied via `pnpm db:reset` locally and via Supabase migration in production                                                                                                      |

## Data flow rules

- **No direct SDK imports in product code.** Telephony goes through `@fg/voice`, LLM goes through `@fg/analysis`, DB goes through `@fg/database` clients. Provider lock-in lives at the abstraction boundary.
- **Service-role only for system jobs.** Webhook handlers, cron jobs, alert engine — all use `createServiceRoleClient`. User-context (anon/authenticated) is for any code reachable from a browser session.
- **RLS is the security wall.** App code does not filter by `tenant_id` for safety; it filters for correctness. RLS is the wall that prevents cross-tenant leaks if app code forgets a filter.
- **Webhooks are idempotent.** Retell/VAPI/Twilio retry on 5xx. Handlers must be safe to replay; check `call_logs.provider_call_id` before inserting.

## Environment topology

```
LOCAL DEV               STAGING                 PRODUCTION
─────────               ───────                 ──────────
Local Postgres          Supabase cloud (1)      Supabase cloud (2)
 (Docker, port 54322)    project                  project

Synthetic data only     Synthetic + sanitized   Real PHI
                          PBACO test data        (BAA-covered)

No PHI ever             No real PHI ever        Full HIPAA controls
```

PHI never touches local or staging environments — see [`security.md`](./security.md).
