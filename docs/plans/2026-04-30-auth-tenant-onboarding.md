# Session 2 — Auth + Tenant Onboarding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL — Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Make Family Guardian B2B loginable end-to-end: a super admin can log in, create a tenant (PBACO), invite the first `tenant_admin` by email; that admin clicks the email link, sets a password, and lands in their tenant's empty dashboard. The tenant admin can then invite `care_team_lead` and `care_team_member` users into their tenant.

**Architecture:** Supabase Auth (email + password only) with a Postgres-side `accept_invite` RPC handling the invite-acceptance transaction. Next 14 middleware reads the Supabase session and a `fg_tenant_id` cookie, validates membership, and forwards `x-fg-user-id` / `x-fg-tenant-id` / `x-fg-role` headers to server components. Server actions handle all mutations (create tenant, invite user, accept invite). RLS continues to enforce tenant isolation; app code never bypasses it. Resend sends invite + reset emails (with a console-log dev fallback when `RESEND_API_KEY` is unset).

**Tech Stack:** Next 14 App Router, Supabase Auth + RLS, `@supabase/ssr` for server/browser/middleware clients, Resend + React Email for transactional mail, Vitest for unit tests on `@fg/auth`, Playwright for the end-to-end onboarding flow.

---

## Context

Session 1 stood up the rails: monorepo, six packages, two Next apps, 10-table schema with RLS enabled+forced, voice/analysis abstractions stubbed, CI green on Node 22 + pnpm 11. The repo is on `main` at GitHub (`finnwillwerth05-spec/FG-B2B`). Nothing is loginable. `@fg/auth` exposes `requireUser`, `requireRole`, and `requireSuperAdmin` _guards_ — but they take a Supabase client argument and there's no Next 14 wrapper that knows how to read cookies or build the client. There is no `middleware.ts`, no `/login` page, no concept of an "active tenant" in a session.

Session 2 fills that gap. By end of session, the system has:

- Real Supabase Auth wired into `care-team-web` (server, browser, and middleware clients)
- A `tenant_invites` table + `accept_invite` Postgres function
- Tenant `slug` (kebab-case, unique) for human-readable URLs
- A super-admin seed script that runs as part of `pnpm db:reset`
- All routes the user spec'd, gated correctly
- The first real tests in the repo (Vitest + Playwright)
- Resend integration with a dev console fallback
- Updated `CLAUDE.md` "What Is Built" checklist

This is a big session — ~17 commits across schema, packages, app, scripts, tests. Plan accordingly.

---

## Decisions I'm making (override at approval)

| #   | Decision                                                                                              | Default                                                                                                                                                                                                                                                                                                                                                        | Why                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| D1  | Email + password only, invite-only signup                                                             | Per user D1, D2                                                                                                                                                                                                                                                                                                                                                | B2B norm; no public sign-up form anywhere                                                 |
| D2  | Tenant slug derived TS-side, not in a Postgres trigger                                                | Kebab-case from name; collisions get `-2`, `-3` suffix in `createTenant` action                                                                                                                                                                                                                                                                                | Easier to test; trigger magic is harder to reason about                                   |
| D3  | Cookie name `fg_tenant_id`, value = tenant UUID, **not** slug                                         | URL uses slug, cookie uses UUID. Decoupled so renaming a tenant doesn't break sessions                                                                                                                                                                                                                                                                         | Slug is human-facing; UUID is the stable identifier. Standard pattern.                    |
| D4  | One Postgres function handles invite acceptance                                                       | `accept_invite(p_token_hash, p_user_id, p_display_name)` does: lock invite row, verify not expired/accepted, insert `user_profiles`, insert `user_tenant_memberships`, mark `accepted_at`. Server action calls Auth admin API first to create the auth.user, then RPCs into this function. If the RPC fails, server action deletes the auth.user to roll back. | D7 wants one transaction; SQL function is the cleanest way                                |
| D5  | Server Actions everywhere for mutations, not API routes                                               | `createTenant`, `inviteUser`, `acceptInvite`, `signIn`, `signOut`, `forgotPassword`, `resetPassword`, `selectTenant` are all `'use server'` actions                                                                                                                                                                                                            | Standard Next 14 pattern; reduces wire chatter                                            |
| D6  | Super-admin seed via Node script, not raw SQL                                                         | `pnpm db:seed:super-admin` (tsx-run script reading `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD`) is chained into `pnpm db:reset`                                                                                                                                                                                                                     | Seed.sql can't read env vars; Auth admin API needs JS                                     |
| D7  | Resend dev fallback writes to `.email-outbox/*.html` and console-logs the link                        | When `RESEND_API_KEY` is unset, `sendEmail()` returns successfully after logging                                                                                                                                                                                                                                                                               | Lets local dev work without a real key; e2e tests still read invites from the DB directly |
| D8  | `@fg/auth` Next 14 wrappers live in `@fg/auth/server` and `@fg/auth/browser` subpath exports          | Keeps server-only code (cookies(), `redirect()`) out of client bundles                                                                                                                                                                                                                                                                                         | Standard subpath-export pattern in monorepos                                              |
| D9  | Middleware refreshes the session on every request via `@supabase/ssr`                                 | Required by Supabase for cookie sync                                                                                                                                                                                                                                                                                                                           | Per Supabase Next 14 docs                                                                 |
| D10 | Public route allowlist is regex-based, in middleware                                                  | `^/(login\|forgot-password\|reset-password\|accept-invite/.*\|api/auth/.*)$`                                                                                                                                                                                                                                                                                   | Explicit; easy to extend                                                                  |
| D11 | One e2e test (Playwright), one unit suite (Vitest on `@fg/auth`)                                      | Sets the pattern; not exhaustive                                                                                                                                                                                                                                                                                                                               | First real tests in the repo; bar is "the pattern is set," not "100% coverage"            |
| D12 | No password complexity rules beyond Supabase defaults                                                 | Supabase enforces 6+ chars by default                                                                                                                                                                                                                                                                                                                          | We're not in a regulatory regime yet; CTO scope                                           |
| D13 | After invite acceptance, the new user is **automatically signed in** to the tenant they accepted into | Their `fg_tenant_id` cookie is set; redirect to `/[slug]/dashboard`                                                                                                                                                                                                                                                                                            | Best UX; no second login                                                                  |
| D14 | Sign-out clears both Supabase session **and** `fg_tenant_id` cookie                                   | Important — leaving the tenant cookie set after signout creates confusing state                                                                                                                                                                                                                                                                                |                                                                                           |

---

## Open questions — applied with the user's defaults; flag for override

| Q                                                                                              | Default applied                                                                                                                                           | Override option                                                                                                                                     |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Q1** Should super admin invite users directly into a tenant, or only the first tenant_admin? | **Only the first tenant_admin** (per user spec). `createTenant` takes `initialAdminEmail`; that admin invites their team after.                           | If you want super admin to invite anyone into any tenant, the team-settings page becomes accessible from `/admin/tenants/[slug]` too. Larger scope. |
| **Q2** Invite to a tenant the user is already a member of — reject or upgrade?                 | **Reject with friendly error**. `inviteUser` checks `user_tenant_memberships` first.                                                                      | Upgrading-on-invite breaks the audit trail; rejection forces explicit role changes via team settings (out of scope this session anyway).            |
| **Q3** Resend domain — placeholder or real?                                                    | **Placeholder `EMAIL_FROM=invites@fg-dev.local`**. Without a verified domain, Resend won't actually deliver. Dev fallback (`.email-outbox/`) substitutes. | Real verified domain is CTO scope; needs DNS access. Out of scope this session.                                                                     |

---

## Schema changes (1 new migration)

`supabase/migrations/20260430000002_auth_invites.sql`:

1. Add `slug text not null unique` to `public.tenants` (with a `default ''` only during the migration so the column add doesn't fail, then backfill, then drop the default).
2. Backfill PBACO row → `slug = 'palm-beach-aco'`.
3. Add `email text` column to `public.user_profiles` (mirror of auth.users.email for joinable display in team-settings — purely a denormalized convenience column, kept in sync via trigger).
4. Trigger on `auth.users` insert/update → upsert `user_profiles` (id, email, display_name from metadata.display_name, is_super_admin defaults to false). This replaces ad-hoc profile creation.
5. New table `public.tenant_invites`:
   - `id uuid pk default gen_random_uuid()`
   - `tenant_id uuid not null references public.tenants(id) on delete cascade`
   - `email text not null`
   - `role membership_role not null`
   - `token_hash text not null unique` (sha256 of the plaintext token; plaintext only sent via email)
   - `expires_at timestamptz not null`
   - `accepted_at timestamptz null`
   - all audit cols + `set_updated_at` trigger
   - Unique partial index on `(tenant_id, lower(email)) where accepted_at is null and deleted_at is null` — prevents duplicate pending invites
6. RLS on `tenant_invites`:
   - SELECT for super_admin OR tenant_admin of the tenant
   - SELECT also allowed by `token_hash` match (anon, for the accept page) — implemented via a dedicated SELECT policy `using (true)` on a _view_ that exposes only minimal fields, OR via a security-definer SQL function `get_invite_by_token(token text) returns table (...)`. Going with the function approach; safer.
   - INSERT for super_admin OR tenant_admin of the tenant
   - UPDATE only by service role (the accept_invite RPC)
7. New SQL function `public.accept_invite(p_token text, p_user_id uuid, p_display_name text) returns uuid`:
   - Hashes `p_token` with sha256
   - Locks the matching `tenant_invites` row
   - Verifies `expires_at > now()` and `accepted_at is null`
   - Inserts into `user_profiles` (id = p_user_id, display_name = p_display_name) on conflict do update display_name
   - Inserts into `user_tenant_memberships` (user_id, tenant_id, role from invite, status='active')
   - Sets `accepted_at = now()` on the invite
   - Returns the tenant_id for redirect
   - Errors raised as named exceptions: `INVITE_NOT_FOUND`, `INVITE_EXPIRED`, `INVITE_ALREADY_ACCEPTED`
8. New SQL function `public.get_invite_by_token(p_token text) returns table (tenant_id uuid, tenant_name text, tenant_slug text, email text, role membership_role, expires_at timestamptz, accepted_at timestamptz)`:
   - security definer, search_path = public
   - For showing the "you've been invited to X as a Y" preview on the accept page

After migration: `pnpm db:reset && pnpm db:types` regenerates the types file.

---

## File tree (target end-of-session)

New / modified files only. Paths relative to repo root.

```
.env.example                                      # new env vars
docs/secrets.md                                   # super-admin seed walkthrough
CLAUDE.md                                         # What Is Built update
docs/plans/2026-04-30-auth-tenant-onboarding.md   # this file

scripts/
  seed-super-admin.ts                             # new

package.json                                      # db:seed:super-admin, db:setup, tsx devdep

supabase/
  migrations/20260430000002_auth_invites.sql      # new
  seed.sql                                        # add slug to PBACO

packages/
  types/src/
    entities.ts                                   # add slug to Tenant; add TenantInvite
    enums.ts                                      # (no change expected)
    index.ts                                      # (no change)
  database/src/
    generated.ts                                  # regenerated
  auth/
    package.json                                  # add subpath exports + 'next' peerDep
    src/
      server.ts                                   # NEW — Next 14 server-side: getServerSupabase(), getSession(), requireUser(), requireTenant(), requireRole(), getActiveMembership()
      browser.ts                                  # NEW — Next 14 browser-side: createSupabaseBrowserClient()
      middleware.ts                               # NEW — Next 14 middleware: createSupabaseMiddlewareClient(), refreshSession()
      guards.ts                                   # KEEP existing (now used internally by server.ts)
      errors.ts                                   # KEEP
      index.ts                                    # re-export server/browser/middleware
      __tests__/server.test.ts                    # NEW — Vitest for guards
      __tests__/__mocks__/supabase.ts             # NEW — supabase client mock builder
    vitest.config.ts                              # NEW
  email/                                          # NEW PACKAGE
    package.json
    tsconfig.json
    src/
      index.ts
      send.ts                                     # sendEmail({ to, subject, react }) with dev fallback
      templates/
        invite-email.tsx                          # React Email
        reset-password-email.tsx                  # React Email

apps/care-team-web/
  package.json                                    # add @fg/email, @react-email/render runtime
  middleware.ts                                   # NEW — auth + tenant context
  app/
    page.tsx                                      # MODIFY — root redirect logic (replaces placeholder)
    (auth)/                                       # auth-route group (no AppShell)
      layout.tsx                                  # bare layout
      login/page.tsx
      login/actions.ts                            # signIn server action
      forgot-password/page.tsx
      forgot-password/actions.ts
      reset-password/page.tsx
      reset-password/actions.ts
      accept-invite/[token]/page.tsx              # invite preview + form
      accept-invite/[token]/actions.ts            # acceptInvite server action
    select-tenant/
      page.tsx                                    # list user's tenants, click to set cookie
      actions.ts                                  # selectTenant server action
    [tenantSlug]/
      layout.tsx                                  # AppShell wrapper
      dashboard/page.tsx                          # placeholder welcome
      settings/team/
        page.tsx                                  # list members + invite form
        actions.ts                                # inviteUser server action
    admin/
      layout.tsx                                  # super_admin guard
      page.tsx                                    # list all tenants
      tenants/new/
        page.tsx                                  # create tenant form
        actions.ts                                # createTenant server action
    api/auth/callback/route.ts                    # Supabase OAuth/reset callback handler
    api/auth/sign-out/route.ts                    # clears cookies, signs out
  components/
    app-shell.tsx                                 # top nav, tenant switcher, user menu
    tenant-switcher.tsx
    user-menu.tsx
    forms/
      login-form.tsx
      forgot-password-form.tsx
      reset-password-form.tsx
      accept-invite-form.tsx
      create-tenant-form.tsx
      invite-user-form.tsx
  lib/
    derive-slug.ts                                # kebab-case derivation + dedupe
    constants.ts                                  # cookie names, public route patterns
  e2e/
    auth-flow.spec.ts                             # Playwright: full onboarding flow
    helpers/
      db.ts                                       # service-role helper for reading invite tokens

packages/voice/                                   # untouched
packages/analysis/                                # untouched
apps/marketing-web/                               # untouched
```

---

## Tasks (sequenced; one commit per task unless noted)

### Task 1 — Schema migration + types regen

**Files:**

- Create: `supabase/migrations/20260430000002_auth_invites.sql`
- Modify: `supabase/seed.sql` (add `slug = 'palm-beach-aco'` to PBACO insert)
- Auto-modified: `packages/database/src/generated.ts`

**Step 1: Write the migration** as described in the "Schema changes" section above. The `slug` column starts nullable + default `''`, backfill PBACO, then `alter column set not null` and drop default. Add the `tenant_invites` table, the `accept_invite` and `get_invite_by_token` functions, and RLS policies for the invites table.

Trigger for syncing email/display_name from auth.users → user_profiles:

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert or update of email on auth.users
  for each row execute function public.handle_new_user();
```

**Step 2: Update seed**

- Add `slug = 'palm-beach-aco'` to the `tenants` insert.

**Step 3: Verify locally**

```sh
pnpm db:reset
docker exec supabase_db_FG_B2B psql -U postgres -d postgres -c "\d public.tenant_invites"
docker exec supabase_db_FG_B2B psql -U postgres -d postgres -c "select slug, name from public.tenants;"
docker exec supabase_db_FG_B2B psql -U postgres -d postgres -c "\df public.accept_invite"
```

Expected: 11 tables now (tenant_invites added), `slug = 'palm-beach-aco'` on PBACO, accept_invite function present.

**Step 4: Regenerate types**

```sh
pnpm db:types
```

Verify `packages/database/src/generated.ts` now includes `tenant_invites` row types and the `accept_invite` / `get_invite_by_token` functions in the `Functions` map.

**Step 5: Commit**

```sh
git add supabase/migrations/20260430000002_auth_invites.sql supabase/seed.sql packages/database/src/generated.ts
git commit -m "feat(db): tenant_invites table, slug on tenants, accept_invite RPC"
```

---

### Task 2 — Update `@fg/types`

**Files:**

- Modify: `packages/types/src/entities.ts` (add `slug` to Tenant, add `TenantInvite`)

**Step 1: Add slug to Tenant**

```ts
// packages/types/src/entities.ts (add to Tenant interface)
export interface Tenant extends AuditColumns {
  name: string;
  slug: string; // NEW
  type: TenantType;
  // ... existing fields
}
```

**Step 2: Add TenantInvite**

```ts
export interface TenantInvite extends AuditColumns {
  tenantId: string;
  email: string;
  role: MembershipRole;
  tokenHash: string; // never sent to clients
  expiresAt: string;
  acceptedAt: string | null;
}

// Public-safe view (no token_hash)
export interface TenantInvitePreview {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  email: string;
  role: MembershipRole;
  expiresAt: string;
  acceptedAt: string | null;
}
```

**Step 3: Verify**

```sh
pnpm --filter @fg/types typecheck
```

**Step 4: Commit**

```sh
git add packages/types
git commit -m "feat(types): add slug to Tenant and TenantInvite types"
```

---

### Task 3 — `@fg/email` package scaffold

**Files:**

- Create: `packages/email/{package.json, tsconfig.json}`
- Create: `packages/email/src/index.ts`
- Create: `packages/email/src/send.ts`
- Create: `packages/email/src/templates/invite-email.tsx`
- Create: `packages/email/src/templates/reset-password-email.tsx`
- Modify: `pnpm-lock.yaml` (after install)

**Step 1: package.json**

```json
{
  "name": "@fg/email",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": {
    "@react-email/components": "^0.0.28",
    "@react-email/render": "^1.0.2",
    "resend": "^4.0.0"
  },
  "peerDependencies": {
    "react": "^18.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "react": "^18.3.1"
  }
}
```

**Step 2: send.ts** with dev console + outbox fallback

```ts
// packages/email/src/send.ts
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { render } from '@react-email/render';
import { Resend } from 'resend';

export interface SendEmailOptions {
  to: string;
  subject: string;
  react: React.ReactElement;
}

export async function sendEmail({ to, subject, react }: SendEmailOptions): Promise<void> {
  const html = await render(react);
  const text = await render(react, { plainText: true });
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'invites@fg-dev.local';

  if (!apiKey) {
    // Dev fallback: console + outbox file
    const outbox = join(process.cwd(), '.email-outbox');
    if (!existsSync(outbox)) mkdirSync(outbox, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = join(outbox, `${stamp}-${to.replace(/[@.]/g, '_')}.html`);
    writeFileSync(file, html);
    console.log(`[email] (dev) to=${to} subject="${subject}" → ${file}`);
    console.log(`[email] (dev) text:\n${text}`);
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from, to, subject, html, text });
  if (error) throw new Error(`Resend send failed: ${error.message}`);
}
```

**Step 3: Templates**

```tsx
// packages/email/src/templates/invite-email.tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components';

export interface InviteEmailProps {
  tenantName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
  expiresInDays: number;
}

export function InviteEmail({
  tenantName,
  inviterName,
  role,
  acceptUrl,
  expiresInDays,
}: InviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You've been invited to join {tenantName} on Family Guardian</Preview>
      <Body
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: '#fafaf9',
          padding: '24px',
        }}
      >
        <Container
          style={{
            maxWidth: '480px',
            margin: '0 auto',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '32px',
            border: '1px solid #e7e5e4',
          }}
        >
          <Heading style={{ fontSize: '20px', margin: '0 0 16px 0' }}>
            You've been invited to {tenantName}
          </Heading>
          <Text>
            {inviterName} invited you to join <strong>{tenantName}</strong> on Family Guardian as a{' '}
            <strong>{role}</strong>.
          </Text>
          <Button
            href={acceptUrl}
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '12px 20px',
              borderRadius: '8px',
              fontWeight: 500,
              textDecoration: 'none',
              display: 'inline-block',
              marginTop: '16px',
            }}
          >
            Accept invite
          </Button>
          <Text style={{ fontSize: '13px', color: '#78716c', marginTop: '24px' }}>
            This invite expires in {expiresInDays} days. If you weren't expecting this, ignore the
            email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

ResetPasswordEmail follows the same shape — heading, action button, expiry note.

**Step 4: index.ts**

```ts
export { sendEmail, type SendEmailOptions } from './send';
export { InviteEmail, type InviteEmailProps } from './templates/invite-email';
export { ResetPasswordEmail, type ResetPasswordEmailProps } from './templates/reset-password-email';
```

**Step 5: tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "jsx": "react-jsx", "lib": ["ES2022", "DOM"] },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

**Step 6: Verify + commit**

```sh
pnpm install
pnpm --filter @fg/email typecheck
git add packages/email pnpm-lock.yaml
git commit -m "feat(email): Resend wrapper with React Email templates and dev fallback"
```

---

### Task 4 — `@fg/auth` Next 14 server / browser / middleware wrappers + tests

**Files:**

- Modify: `packages/auth/package.json` (subpath exports + `next`, `react` peer deps)
- Create: `packages/auth/src/server.ts`
- Create: `packages/auth/src/browser.ts`
- Create: `packages/auth/src/middleware.ts`
- Modify: `packages/auth/src/index.ts`
- Create: `packages/auth/src/__tests__/server.test.ts`
- Create: `packages/auth/src/__tests__/__mocks__/supabase.ts`
- Create: `packages/auth/vitest.config.ts`

**Step 1: package.json subpath exports**

```json
{
  "name": "@fg/auth",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./server": "./src/server.ts",
    "./browser": "./src/browser.ts",
    "./middleware": "./src/middleware.ts"
  },
  "peerDependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0"
  },
  "dependencies": {
    "@fg/database": "workspace:*",
    "@fg/types": "workspace:*",
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.45.5"
  }
}
```

**Step 2: server.ts** (consumes Next `cookies()` and `redirect()`)

```ts
// packages/auth/src/server.ts
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient as createSsrServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { MembershipRole } from '@fg/types';
import { AuthorizationError, UnauthenticatedError } from './errors';

const TENANT_COOKIE = 'fg_tenant_id';

export function getServerSupabase(): SupabaseClient {
  const cookieStore = cookies();
  return createSsrServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as CookieOptions),
            );
          } catch {
            /* called from a Server Component — ignore; middleware refreshes */
          }
        },
      },
    },
  );
}

export async function getSession() {
  const supabase = getServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getSession();
  if (!user) redirect('/login');
  return user;
}

export interface ActiveMembership {
  userId: string;
  tenantId: string | null;
  tenantSlug: string | null;
  role: MembershipRole | null;
  isSuperAdmin: boolean;
}

export async function getActiveMembership(): Promise<ActiveMembership> {
  const user = await requireUser();
  const supabase = getServerSupabase();
  const cookieStore = cookies();
  const tenantId = cookieStore.get(TENANT_COOKIE)?.value ?? null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle();
  const isSuperAdmin = !!profile?.is_super_admin;

  if (!tenantId)
    return { userId: user.id, tenantId: null, tenantSlug: null, role: null, isSuperAdmin };

  const { data: membership } = await supabase
    .from('user_tenant_memberships')
    .select('role, tenants:tenants!inner(slug)')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (!membership)
    return { userId: user.id, tenantId: null, tenantSlug: null, role: null, isSuperAdmin };

  return {
    userId: user.id,
    tenantId,
    tenantSlug: (membership.tenants as { slug: string }).slug,
    role: membership.role as MembershipRole,
    isSuperAdmin,
  };
}

export async function requireTenant(): Promise<
  ActiveMembership & { tenantId: string; tenantSlug: string; role: MembershipRole }
> {
  const m = await getActiveMembership();
  if (!m.tenantId || !m.role) redirect('/select-tenant');
  return m as Required<ActiveMembership>;
}

const ROLE_RANK: Record<MembershipRole, number> = {
  care_team_member: 1,
  care_team_lead: 2,
  tenant_admin: 3,
};

export async function requireRole(
  minRole: MembershipRole | 'super_admin',
): Promise<ActiveMembership> {
  const m = await getActiveMembership();
  if (m.isSuperAdmin) return m;
  if (minRole === 'super_admin') throw new AuthorizationError('Super admin required');
  if (!m.role || ROLE_RANK[m.role] < ROLE_RANK[minRole]) {
    throw new AuthorizationError(`Requires ${minRole} or higher`);
  }
  return m;
}
```

**Step 3: browser.ts**

```ts
// packages/auth/src/browser.ts
import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

**Step 4: middleware.ts** (Next 14 middleware client)

```ts
// packages/auth/src/middleware.ts
import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function refreshSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { response, supabase, user };
}
```

**Step 5: index.ts barrel**

```ts
export * from './errors';
export * from './guards'; // legacy lower-level helpers, kept
// Server/browser/middleware are explicitly imported via subpaths in app code
// so we don't bloat client bundles. Don't re-export them here.
```

**Step 6: Tests** (Vitest)

`packages/auth/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node' } });
```

`packages/auth/src/__tests__/__mocks__/supabase.ts`:

```ts
import { vi } from 'vitest';

interface MockOpts {
  user?: { id: string; email: string } | null;
  profile?: { is_super_admin: boolean } | null;
  membership?: { role: string; tenants: { slug: string } } | null;
}

export function buildMockClient(opts: MockOpts) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: opts.user ?? null }, error: null }),
    },
    from: vi.fn((table: string) => {
      const builder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: table === 'user_profiles' ? opts.profile : opts.membership,
          error: null,
        }),
      };
      return builder;
    }),
  };
}
```

`packages/auth/src/__tests__/server.test.ts` covers:

- `getSession` returns null when Supabase says no user
- `getSession` returns user when authed
- `requireUser` redirects (mock `redirect` from `next/navigation`) when unauth
- `getActiveMembership` returns `tenantId: null` when no cookie
- `getActiveMembership` returns full membership when cookie + valid membership
- `requireRole('care_team_lead')` throws when caller is care_team_member
- `requireRole('care_team_lead')` passes when caller is tenant_admin
- `requireRole('super_admin')` passes when `isSuperAdmin = true`

Mock `next/headers` (cookies) and `next/navigation` (redirect) at module level.

**Step 7: Verify + commit**

```sh
pnpm install
pnpm --filter @fg/auth typecheck
pnpm --filter @fg/auth test    # ~8 tests should pass
git add packages/auth pnpm-lock.yaml
git commit -m "feat(auth): Next 14 server/browser/middleware wrappers + Vitest"
```

---

### Task 5 — care-team-web Supabase wiring + middleware.ts

**Files:**

- Modify: `apps/care-team-web/package.json` (add `@fg/email` workspace dep)
- Create: `apps/care-team-web/middleware.ts`
- Create: `apps/care-team-web/lib/constants.ts`
- Create: `apps/care-team-web/lib/derive-slug.ts`

**Step 1: middleware.ts**

```ts
// apps/care-team-web/middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { refreshSession } from '@fg/auth/middleware';
import { PUBLIC_ROUTE_PATTERNS, TENANT_COOKIE } from './lib/constants';

export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await refreshSession(request);
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTE_PATTERNS.some((re) => re.test(pathname))) return response;

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Tenant context
  const tenantId = request.cookies.get(TENANT_COOKIE)?.value;
  const isAdminRoute = pathname.startsWith('/admin');
  const isTenantRoute = /^\/[a-z0-9-]+\//.test(pathname) && !isAdminRoute;

  if (isAdminRoute) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile?.is_super_admin) {
      const url = request.nextUrl.clone();
      url.pathname = '/select-tenant';
      return NextResponse.redirect(url);
    }
  }

  if (isTenantRoute) {
    if (!tenantId) {
      const url = request.nextUrl.clone();
      url.pathname = '/select-tenant';
      return NextResponse.redirect(url);
    }
    const { data: membership } = await supabase
      .from('user_tenant_memberships')
      .select('role, tenants:tenants!inner(slug)')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();
    if (!membership) {
      const url = request.nextUrl.clone();
      url.pathname = '/select-tenant';
      return NextResponse.redirect(url);
    }
    response.headers.set('x-fg-user-id', user.id);
    response.headers.set('x-fg-tenant-id', tenantId);
    response.headers.set('x-fg-role', membership.role as string);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

**Step 2: constants.ts**

```ts
export const TENANT_COOKIE = 'fg_tenant_id';
export const TENANT_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const INVITE_EXPIRY_DAYS = 7;

export const PUBLIC_ROUTE_PATTERNS: RegExp[] = [
  /^\/login$/,
  /^\/forgot-password$/,
  /^\/reset-password$/,
  /^\/accept-invite\/.+$/,
  /^\/api\/auth\/.+$/,
];
```

**Step 3: derive-slug.ts**

```ts
// kebab-case + unique-ize. Caller (createTenant action) supplies a check fn
// that returns true if slug is taken, then we suffix -2, -3 ...
export function deriveSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64);
}

export async function deriveUniqueSlug(
  name: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = deriveSlug(name);
  if (!base) throw new Error('Name produces empty slug');
  if (!(await isTaken(base))) return base;
  for (let n = 2; n <= 99; n++) {
    const candidate = `${base}-${n}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error('Could not derive unique slug after 99 attempts');
}
```

**Step 4: Verify build + commit**

```sh
pnpm --filter care-team-web typecheck
pnpm --filter care-team-web build
git add apps/care-team-web pnpm-lock.yaml
git commit -m "feat(care-team-web): middleware enforces auth + tenant context"
```

---

### Task 6 — Auth pages: /login, /forgot-password, /reset-password

**Files:**

- Create: `apps/care-team-web/app/(auth)/layout.tsx`
- Create: `apps/care-team-web/app/(auth)/login/{page.tsx, actions.ts}`
- Create: `apps/care-team-web/app/(auth)/forgot-password/{page.tsx, actions.ts}`
- Create: `apps/care-team-web/app/(auth)/reset-password/{page.tsx, actions.ts}`
- Create: `apps/care-team-web/app/api/auth/callback/route.ts`
- Create: `apps/care-team-web/app/api/auth/sign-out/route.ts`
- Create: `apps/care-team-web/components/forms/login-form.tsx`
- Create: `apps/care-team-web/components/forms/forgot-password-form.tsx`
- Create: `apps/care-team-web/components/forms/reset-password-form.tsx`
- Modify: `apps/care-team-web/app/page.tsx` (root redirect)

**(auth)/layout.tsx** — bare layout (no AppShell), centered card.

**login/page.tsx** — server component renders `<LoginForm />`.

**login/actions.ts**:

```ts
'use server';
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@fg/auth/server';

export async function signIn(formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/');
  const supabase = getServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect(next || '/');
}
```

**LoginForm** — `<form action={signIn}>` with email/password inputs and inline error display via `useFormState`.

**forgot-password/actions.ts** calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: ${origin}/reset-password })`.

**reset-password/actions.ts** calls `supabase.auth.updateUser({ password })` after token exchange.

**api/auth/callback/route.ts** — handles Supabase email-link callbacks (exchange code → session, then redirect).

**api/auth/sign-out/route.ts** — calls `supabase.auth.signOut()`, clears `fg_tenant_id` cookie, redirects to `/login`.

**Modified app/page.tsx**:

```tsx
import { redirect } from 'next/navigation';
import { getActiveMembership } from '@fg/auth/server';

export default async function RootPage() {
  const m = await getActiveMembership(); // throws redirect to /login if unauth via requireUser inside
  if (m.isSuperAdmin && !m.tenantId) redirect('/admin');
  if (!m.tenantId || !m.tenantSlug) redirect('/select-tenant');
  redirect(`/${m.tenantSlug}/dashboard`);
}
```

**Step: Verify + commit**

```sh
pnpm --filter care-team-web typecheck && pnpm --filter care-team-web build
git add apps/care-team-web
git commit -m "feat(care-team-web): login, forgot-password, reset-password flows"
```

---

### Task 7 — /select-tenant + tenant cookie

**Files:**

- Create: `apps/care-team-web/app/select-tenant/{page.tsx, actions.ts}`

**page.tsx** lists user's tenants from `user_tenant_memberships join tenants`. Auto-redirects to `/[slug]/dashboard` if exactly one tenant. Otherwise renders a list of tenant cards.

**actions.ts**:

```ts
'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { TENANT_COOKIE, TENANT_COOKIE_MAX_AGE } from '@/lib/constants';

export async function selectTenant(formData: FormData) {
  const tenantId = String(formData.get('tenantId') ?? '');
  const tenantSlug = String(formData.get('tenantSlug') ?? '');
  if (!tenantId || !tenantSlug) return { error: 'Missing tenant' };
  cookies().set(TENANT_COOKIE, tenantId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TENANT_COOKIE_MAX_AGE,
    path: '/',
  });
  redirect(`/${tenantSlug}/dashboard`);
}
```

**Step: Verify + commit**

```sh
git add apps/care-team-web/app/select-tenant
git commit -m "feat(care-team-web): tenant selection page"
```

---

### Task 8 — AppShell + tenant dashboard placeholder

**Files:**

- Create: `apps/care-team-web/components/{app-shell.tsx, tenant-switcher.tsx, user-menu.tsx}`
- Create: `apps/care-team-web/app/[tenantSlug]/{layout.tsx, dashboard/page.tsx}`

**app-shell.tsx** — top nav with logo, `<TenantSwitcher>`, `<UserMenu>`. Children below.

**tenant-switcher.tsx** — dropdown listing tenants from server data; clicking calls `selectTenant` action.

**user-menu.tsx** — display name + sign-out button (POSTs to `/api/auth/sign-out`).

**[tenantSlug]/layout.tsx** — calls `requireTenant()`, validates `params.tenantSlug` matches the active tenant's slug (else redirect), renders `<AppShell>{children}</AppShell>`.

**[tenantSlug]/dashboard/page.tsx**:

```tsx
import { requireTenant, getServerSupabase } from '@fg/auth/server';

export default async function DashboardPage({ params }: { params: { tenantSlug: string } }) {
  const m = await requireTenant();
  const supabase = getServerSupabase();
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', m.userId)
    .single();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', m.tenantId)
    .single();
  return (
    <main className="container mx-auto p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Welcome, {profile?.display_name}</h1>
      <p className="mt-2 text-muted-foreground">
        You are a {m.role.replace('_', ' ')} of {tenant?.name}.
      </p>
      <p className="mt-8 text-sm text-muted-foreground">
        Patients, calls, alerts, and reports arrive in later sessions.
      </p>
    </main>
  );
}
```

**Step: Verify + commit**

```sh
git add apps/care-team-web
git commit -m "feat(care-team-web): AppShell and tenant dashboard placeholder"
```

---

### Task 9 — Super admin: /admin + /admin/tenants/new + createTenant action

**Files:**

- Create: `apps/care-team-web/app/admin/{layout.tsx, page.tsx, tenants/new/{page.tsx, actions.ts}}`
- Create: `apps/care-team-web/components/forms/create-tenant-form.tsx`

**admin/layout.tsx** — calls `requireRole('super_admin')`. Renders bare admin shell (no tenant switcher).

**admin/page.tsx** — table of all tenants (super-admin can SELECT all per RLS). "Create tenant" button → `/admin/tenants/new`.

**admin/tenants/new/actions.ts** does (in order):

1. `requireRole('super_admin')`
2. Validate name + type + initialAdminEmail (zod)
3. `deriveUniqueSlug(name, slug => check tenants table)`
4. Insert tenant row (service-role client because RLS allows insert only by super_admin via policy, and the helper functions need a session... actually super_admin policy allows it, so use the user-session client)
5. Generate invite token (32 bytes, base64url), hash with sha256, insert `tenant_invites` row
6. Send `InviteEmail` via `@fg/email` to initialAdminEmail with link `${origin}/accept-invite/${plaintextToken}`
7. Redirect to `/admin?created=<slug>`

```ts
'use server';
import { randomBytes, createHash } from 'node:crypto';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getServerSupabase, requireRole } from '@fg/auth/server';
import { sendEmail, InviteEmail } from '@fg/email';
import { deriveUniqueSlug } from '@/lib/derive-slug';
import { INVITE_EXPIRY_DAYS } from '@/lib/constants';

const Schema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum(['aco', 'ma_plan', 'physician_group', 'home_health', 'snf']),
  initialAdminEmail: z.string().email(),
});

export async function createTenant(formData: FormData) {
  await requireRole('super_admin');
  const parsed = Schema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    initialAdminEmail: formData.get('initialAdminEmail'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid' };

  const supabase = getServerSupabase();
  const slug = await deriveUniqueSlug(parsed.data.name, async (s) => {
    const { count } = await supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .eq('slug', s);
    return (count ?? 0) > 0;
  });

  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .insert({ name: parsed.data.name, slug, type: parsed.data.type })
    .select('id, slug, name')
    .single();
  if (tenantErr) return { error: tenantErr.message };

  const tokenPlain = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(tokenPlain).digest('hex');
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 86400_000).toISOString();

  await supabase.from('tenant_invites').insert({
    tenant_id: tenant.id,
    email: parsed.data.initialAdminEmail,
    role: 'tenant_admin',
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  await sendEmail({
    to: parsed.data.initialAdminEmail,
    subject: `You've been invited to ${tenant.name} on Family Guardian`,
    react: InviteEmail({
      tenantName: tenant.name,
      inviterName: 'Family Guardian',
      role: 'tenant admin',
      acceptUrl: `${origin}/accept-invite/${tokenPlain}`,
      expiresInDays: INVITE_EXPIRY_DAYS,
    }),
  });

  redirect(`/admin?created=${tenant.slug}`);
}
```

**Step: Verify + commit**

```sh
pnpm --filter care-team-web typecheck
git add apps/care-team-web
git commit -m "feat(care-team-web): super-admin tenant creation with first-admin invite"
```

---

### Task 10 — Team settings + inviteUser action

**Files:**

- Create: `apps/care-team-web/app/[tenantSlug]/settings/team/{page.tsx, actions.ts}`
- Create: `apps/care-team-web/components/forms/invite-user-form.tsx`

**page.tsx** — `requireRole('tenant_admin')`. Lists current memberships + pending invites. Renders `<InviteUserForm>` with role dropdown (tenant_admin, care_team_lead, care_team_member).

**actions.ts** `inviteUser({ email, role })` — same shape as Task 9's invite generation, with the Q2 default check (reject if user is already a member of this tenant).

```ts
// short version
const { data: existing } = await supabase
  .from('user_tenant_memberships')
  .select('id, user_profiles:user_profiles!inner(email)')
  .eq('tenant_id', m.tenantId)
  .filter('user_profiles.email', 'eq', email);
if (existing && existing.length > 0) return { error: 'User is already a member of this tenant' };
```

**Step: Verify + commit**

```sh
git add apps/care-team-web
git commit -m "feat(care-team-web): team settings page with invite flow"
```

---

### Task 11 — /accept-invite/[token]

**Files:**

- Create: `apps/care-team-web/app/(auth)/accept-invite/[token]/{page.tsx, actions.ts}`
- Create: `apps/care-team-web/components/forms/accept-invite-form.tsx`

**page.tsx** is a server component:

1. Hash the URL token
2. Call `get_invite_by_token(plain_token)` RPC (security definer; reads via token only)
3. If not found, expired, or accepted → render error state
4. Else render `<AcceptInviteForm>` showing "You've been invited to {tenant_name} as {role}" + email/password/displayName fields

**actions.ts** `acceptInvite({ token, password, displayName })`:

1. Server-side fetch invite preview again (don't trust client)
2. Use service-role Supabase client (`createServiceRoleClient`) to call `auth.admin.createUser({ email: invite.email, password, email_confirm: true, user_metadata: { display_name } })`
3. On success: call `accept_invite(token, user_id, displayName)` RPC via service-role
4. On RPC failure: delete the auth user via admin API to roll back
5. Sign the new user in: `supabase.auth.signInWithPassword({ email, password })` (using user-session client)
6. Set `fg_tenant_id` cookie to `tenant_id` from the RPC return
7. `redirect('/${tenant_slug}/dashboard')`

**Step: Verify + commit**

```sh
git add apps/care-team-web
git commit -m "feat(care-team-web): accept-invite flow with auth admin + RPC"
```

---

### Task 12 — Super-admin seed script

**Files:**

- Create: `scripts/seed-super-admin.ts`
- Modify: `package.json` (scripts + tsx devDep)
- Modify: `.env.example` (`SEED_SUPER_ADMIN_EMAIL`, `SEED_SUPER_ADMIN_PASSWORD`)
- Modify: `docs/secrets.md`

**scripts/seed-super-admin.ts**:

```ts
import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const email = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'superadmin@fg-dev.local';
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'fg-dev-superadmin-1234';

  const supabase = createClient(url, key);
  const { data: existing } = await supabase.auth.admin.listUsers();
  if (existing.users.some((u) => u.email === email)) {
    console.log(`[seed-super-admin] ${email} already exists, skipping`);
    return;
  }
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: 'Super Admin' },
  });
  if (error) {
    console.error(error);
    process.exit(1);
  }
  await supabase.from('user_profiles').update({ is_super_admin: true }).eq('id', created.user.id);
  console.log(`[seed-super-admin] created ${email} as super admin`);
}
main();
```

**package.json scripts**:

```jsonc
"db:reset": "supabase db reset && pnpm db:seed:super-admin",
"db:seed:super-admin": "tsx --env-file=.env.local scripts/seed-super-admin.ts",
"db:setup": "pnpm db:start && pnpm db:reset && pnpm db:types",
```

Add `tsx: ^4.19.x` to devDependencies.

**.env.example additions**:

```
SEED_SUPER_ADMIN_EMAIL=superadmin@fg-dev.local
SEED_SUPER_ADMIN_PASSWORD=fg-dev-superadmin-1234
RESEND_API_KEY=
EMAIL_FROM=invites@fg-dev.local
```

**docs/secrets.md** — new section "Super-admin seeding": describes the env vars, that `pnpm db:reset` now runs the seed script after applying migrations, and notes that this is local-dev-only (never run against staging/prod).

**Step: Verify**

```sh
cp .env.example .env.local && # fill in NEXT_PUBLIC_SUPABASE_* and SUPABASE_SERVICE_ROLE_KEY from `pnpm db:start` output
pnpm db:reset
# should see: [seed-super-admin] created superadmin@fg-dev.local as super admin
```

**Commit**:

```sh
git add scripts package.json .env.example docs/secrets.md pnpm-lock.yaml
git commit -m "feat(db): super-admin seed script chained into db:reset"
```

---

### Task 13 — Playwright e2e: full onboarding flow

**Files:**

- Create: `apps/care-team-web/e2e/auth-flow.spec.ts`
- Create: `apps/care-team-web/e2e/helpers/db.ts`

**helpers/db.ts** uses service-role to read the most-recent invite for a given email and return the plaintext token (we _can't_ — we only stored the hash). Workaround: the test action that creates the invite captures the token before sending the email. Better: the test reads the `.email-outbox/` directory and parses the token from the most recent email file's `acceptUrl`.

```ts
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function readMostRecentInviteToken(emailContains: string): Promise<string> {
  const outbox = join(process.cwd(), '.email-outbox');
  const files = (await readdir(outbox))
    .filter((f) => f.includes(emailContains.replace(/[@.]/g, '_')))
    .sort()
    .reverse();
  if (files.length === 0) throw new Error(`No invite email found for ${emailContains}`);
  const html = await readFile(join(outbox, files[0]!), 'utf8');
  const match = html.match(/accept-invite\/([A-Za-z0-9_-]+)/);
  if (!match) throw new Error('No accept-invite token in email');
  return match[1]!;
}
```

**auth-flow.spec.ts** (the one e2e):

```ts
import { test, expect } from '@playwright/test';
import { readMostRecentInviteToken } from './helpers/db';

test('super admin onboards first tenant_admin', async ({ page }) => {
  // 1. Log in as super admin
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.SEED_SUPER_ADMIN_EMAIL!);
  await page.getByLabel('Password').fill(process.env.SEED_SUPER_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin/);

  // 2. Create a tenant
  await page.getByRole('link', { name: /create tenant/i }).click();
  await page.getByLabel('Name').fill('E2E Test ACO');
  await page.getByLabel('Type').selectOption('aco');
  await page.getByLabel(/initial admin email/i).fill('e2e-admin@fg-dev.local');
  await page.getByRole('button', { name: /create/i }).click();
  await expect(page).toHaveURL(/\/admin\?created=/);

  // 3. Read invite token from outbox
  const token = await readMostRecentInviteToken('e2e-admin@fg-dev.local');

  // 4. Sign out, accept invite
  await page.goto('/api/auth/sign-out');
  await page.goto(`/accept-invite/${token}`);
  await page.getByLabel(/display name/i).fill('E2E Admin');
  await page.getByLabel('Password').fill('e2e-admin-password-xyz');
  await page.getByRole('button', { name: /accept/i }).click();

  // 5. Should land on dashboard
  await expect(page).toHaveURL(/\/e2e-test-aco\/dashboard/);
  await expect(page.getByRole('heading', { name: /Welcome, E2E Admin/i })).toBeVisible();
  await expect(page.getByText(/tenant admin of E2E Test ACO/i)).toBeVisible();
});
```

**Step: Verify**

```sh
pnpm db:setup    # ensure clean DB + super-admin seeded
pnpm --filter care-team-web test:e2e
```

**Commit**:

```sh
git add apps/care-team-web/e2e
git commit -m "test(e2e): super-admin onboards first tenant_admin"
```

---

### Task 14 — CLAUDE.md update + final verification

**Files:**

- Modify: `CLAUDE.md` (move items from Not Built to Built; add Auth section)

Update **What Is Built**:

- ✅ Auth (Supabase email + password); login, forgot-password, reset-password flows
- ✅ Multi-tenant context: `fg_tenant_id` cookie, slug-based URLs, middleware enforcement
- ✅ `@fg/auth/server`: `getSession`, `requireUser`, `requireTenant`, `requireRole`, `getActiveMembership`
- ✅ Super-admin tenant creation + first-admin invite
- ✅ Tenant team-settings invite flow
- ✅ Accept-invite flow (auth admin API + accept_invite RPC)
- ✅ `tenant_invites` table + slug column on tenants
- ✅ `@fg/email` (Resend + React Email; dev fallback to `.email-outbox/`)
- ✅ Super-admin seed script (`pnpm db:reset` chains it)
- ✅ First Vitest tests (`@fg/auth`) and first Playwright e2e

Update **Not Built** (remove things now built; carry the rest forward).

Add new **Authentication & tenant context** section to "Database Conventions" — points engineers at `getActiveMembership()` and the `x-fg-*` middleware headers.

Run final smoke:

```sh
pnpm typecheck && pnpm lint && pnpm test && pnpm build
pnpm db:setup
pnpm dev   # both apps boot; manual probe of /login → admin flow
```

**Commit + push:**

```sh
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md What Is Built for Session 2 (auth + onboarding)"
git push origin main
gh run watch --exit-status   # or watch latest run
```

CI must be green before declaring Session 2 done.

---

## Verification — end of session

| Check          | Command                                                                                                        | Expected                                |
| -------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Schema         | `docker exec supabase_db_FG_B2B psql -U postgres -d postgres -c "\dt public.*"`                                | 11 tables (10 + tenant_invites)         |
| Slug           | `... -c "select slug from public.tenants;"`                                                                    | 1 row, `palm-beach-aco`                 |
| Functions      | `... -c "\df public.accept_invite"`                                                                            | function present                        |
| Types          | `pnpm db:types`                                                                                                | clean regen, no diff if no schema drift |
| Unit tests     | `pnpm --filter @fg/auth test`                                                                                  | ≥8 passing                              |
| E2E test       | `pnpm --filter care-team-web test:e2e`                                                                         | 1 passing                               |
| Lint/typecheck | `pnpm lint && pnpm typecheck`                                                                                  | green across 9 workspaces               |
| Build          | `pnpm build`                                                                                                   | both apps build static + dynamic routes |
| CI             | `gh run list --limit 1`                                                                                        | success on latest main push             |
| Manual         | `pnpm db:setup && pnpm dev` → log in as super admin → create tenant → invite admin → accept invite → dashboard | end-to-end works in browser             |

---

## Out of scope (carry to a later session)

- MFA / TOTP / SMS auth
- Patient management UI
- Voice / call infrastructure
- PHI access audit log
- Tenant deletion / member removal / role downgrade UI
- Profile editing beyond display_name on invite acceptance
- Branded login page styling
- Real Resend domain (CTO scope)
- Production super-admin bootstrap (CTO scope)
- GitHub Actions deprecation cleanup (`actions/checkout@v4` → `@v5` etc., due before June 2026)

---

## Recommended Session 3 (after this lands)

**Voice + analysis end-to-end stub** — implement `RetellProvider.placeOutboundCall`, write a webhook handler, wire `ClaudeAnalysisProvider.analyzeTranscript`, generate one alert per analyzed call, render alerts in the tenant dashboard. Drives the call-lifecycle diagram in `docs/architecture.md` from blueprint into reality.
