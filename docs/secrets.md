# Secrets

How to populate `.env.local` for local dev. **Never commit real values.** `.env.local` is gitignored; `.env.example` is the only env file under version control.

## Quick start

```sh
cp .env.example .env.local
pnpm db:start
```

`pnpm db:start` prints local Supabase URLs + keys. Paste the `anon key` and `service_role key` into `.env.local` under `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` respectively. The URL is already correct.

For everything else (Anthropic, Retell, etc.), get a key only when the feature lands. Foundation works with just Supabase populated.

## Where each value comes from

### Supabase

- **Local dev:** `pnpm db:start` prints them. Local stack always uses the same demo keys, so committing them to `.env.local` (which is gitignored) is fine.
- **Staging / production:** Supabase project dashboard → Settings → API. Two keys matter:
  - `anon key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser-safe)
  - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (server-only, bypasses RLS, **never** include in any client bundle)

### Super-admin seed (local dev)

`pnpm db:reset` chains a Node script (`scripts/seed-super-admin.ts`) that creates one local-dev super admin. Credentials come from `.env.local`:

- `SEED_SUPER_ADMIN_EMAIL` (default `superadmin@fg-dev.local`)
- `SEED_SUPER_ADMIN_PASSWORD` (default `fg-dev-superadmin-1234`)

The script is idempotent — re-running it just ensures `is_super_admin` is `true` on the matching `user_profiles` row. It needs `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` from the same `.env.local` that the app reads. It will refuse to run if either is missing.

**Never run this against staging or production.** It writes to `auth.users` directly and grants super-admin privileges. Production super admins are bootstrapped via a separate (CTO-scoped) procedure that's not in this repo yet.

To boot a fresh local stack from scratch in one command:

```sh
pnpm db:setup    # = db:start + db:reset (which chains the seed) + db:types
```

### Email — Resend

Set `RESEND_API_KEY` to actually send. When it's unset, `@fg/email` falls back to writing rendered HTML to `.email-outbox/{timestamp}-{recipient}.html` and console-logging the path. The Playwright e2e test parses invite tokens out of those files. `EMAIL_FROM` defaults to `invites@fg-dev.local`; replace with a verified domain before sending real emails.

### Anthropic

- Get a key at https://console.anthropic.com → API Keys
- Default model: `claude-sonnet-4-6` (set in `packages/analysis/src/providers/claude.ts`)
- For Sonnet 4.6 access, the workspace's billing must have credit on file

### Retell (planned first voice provider)

- Sign up at https://retellai.com
- Create an Agent for the daily check-in conversation flow → use the agent ID
- API key from Settings → API Keys
- Webhook secret: when you create the webhook URL pointing at `apps/care-team-web/app/api/webhooks/retell/route.ts`, Retell generates a signing secret. Save it for HMAC verification.

### VAPI (alternative)

- https://dashboard.vapi.ai → API Keys, Assistants, Phone Numbers

### ElevenLabs + Twilio (DIY)

- ElevenLabs: https://elevenlabs.io → Profile → API Keys
- Twilio: https://console.twilio.com → Account SID, Auth Token, and a purchased phone number with voice capability

### LiveKit

- Self-hosted or LiveKit Cloud → API Key + Secret + WS URL

### `CRON_SECRET`

Random hex string protecting internal cron endpoints. Generate locally:

```sh
openssl rand -hex 32
```

Same value goes in Vercel cron `Authorization: Bearer <secret>` header config.

## Vercel deployment

Production env vars live in the Vercel project's **Environment Variables** dashboard, scoped to Production / Preview / Development. The app does **not** read `.env*` files in production — Vercel injects values directly. Only commit the **shape** in `.env.example`.

## Rotating a leaked secret

If a real value lands in git (it shouldn't — `.env*` is in `.gitignore` — but if):

1. **Immediately rotate** the leaked credential at the provider (Supabase / Anthropic / Retell / etc.)
2. **Force-push history** to remove the value (`git filter-repo --replace-text` or BFG)
3. **Audit logs** at the provider for unauthorized use during the exposure window
4. **Notify** the founders + log in a security tracker (when one exists)

Don't try to "fix" via a follow-up commit — the value stays in history.

## Known gotchas

- The Supabase v1 CLI (which we use locally — `brew install supabase/tap/supabase` is blocked by an Xcode CLT requirement, so we ship via npm) returns a **502 error after `db reset`** because the `supabase_pooler_FG_B2B` container fails to restart cleanly. The migration applies fully before the error fires; the database is healthy. Verify with `docker exec supabase_db_FG_B2B psql -U postgres -d postgres -c "select count(*) from public.tenants;"` — should return 1 (PBACO seed).
- Pnpm v11 requires explicit allowlist for npm packages with build scripts. The `supabase` and `esbuild` postinstalls are pre-approved in [`pnpm-workspace.yaml`](../pnpm-workspace.yaml). Adding a new dep with a postinstall script will surface an `ERR_PNPM_IGNORED_BUILDS` warning until you add it to `allowBuilds`.
- `next-env.d.ts` is auto-generated on first `next dev`/`next build`. It's gitignored per app; not a problem.
