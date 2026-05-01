# Database

## Schema decisions

### Row-level multi-tenancy, not schema-per-tenant

Every domain table carries a `tenant_id` column with an FK to `tenants(id)`. Cross-tenant isolation is enforced by Postgres Row-Level Security policies that check the calling user's tenant memberships.

**Why not schema-per-tenant?**

| Concern                                                 | Schema-per-tenant                          | Row-level (chosen)                             |
| ------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------- |
| Migration                                               | N migrations per change (N = tenant count) | Single migration                               |
| Cross-tenant analytics                                  | Painful (UNION ALL across schemas)         | Trivial                                        |
| Connection pooling                                      | Schema name in pool key — fragmenting      | Single pool                                    |
| RLS / Supabase tooling                                  | Doesn't compose well                       | Native fit                                     |
| Operational blast radius if a query forgets `tenant_id` | Low                                        | High → mitigated by `force row level security` |
| Onboarding a new tenant                                 | DDL (slow, role+schema+grants)             | DML (`insert into tenants`)                    |

The blast-radius concern is the real one. We mitigate with `force row level security` so even table owners hit policies, and helper functions (`auth_user_tenants`) that route every policy through one source of truth.

### Audit columns + soft delete

Every table has `created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`, `deleted_by`. The `set_updated_at()` trigger maintains `updated_at`. Soft delete only — never `delete from`. Reasons:

- **Compliance.** Audit logs ask who-did-what; FK chains break if rows hard-disappear
- **Recoverability.** Mistakes get reverted by setting `deleted_at = null`
- **Analytics.** Outcome reports look back over time; deleted patients still count

### RLS pattern

Every domain table:

```sql
alter table public.foo enable row level security;
alter table public.foo force row level security;
```

`force` is the magic word — without it, table owners (the `postgres` role) skip RLS, which means migrations and Supabase Studio bypass policies. With it, only roles with `BYPASSRLS` (Supabase's `service_role`) skip — which is exactly the boundary we want.

Policies route through three SQL helper functions (defined in `supabase/migrations/20260430000001_init.sql`):

```sql
auth_user_tenants() returns setof uuid          -- caller's active tenant memberships
auth_user_is_super_admin() returns boolean
auth_user_role_in_tenant(uuid) returns membership_role
```

All three are `security definer` with `set search_path = public`. The fixed search path prevents search-path hijacking; the security definer lets the function read `user_tenant_memberships` without recursive RLS evaluation.

A typical policy:

```sql
create policy patients_all on public.patients
  for all
  using (
    public.auth_user_is_super_admin()
    or tenant_id in (select public.auth_user_tenants())
  )
  with check (
    public.auth_user_is_super_admin()
    or tenant_id in (select public.auth_user_tenants())
  );
```

`USING` is for SELECT/UPDATE/DELETE row visibility; `WITH CHECK` is for INSERT/UPDATE-target validation. Both must pass.

### System writes via service role

Tables like `call_logs`, `call_analyses`, and `outcome_reports` have `select` policies but no `insert` or `update` policies — they're written exclusively by system jobs using `createServiceRoleClient` (which has `BYPASSRLS`). User-context code can read them but cannot write, which is correct: a care-team-member shouldn't be able to fabricate a call transcript.

### Generated types

`pnpm db:types` writes `packages/database/src/generated.ts` from the live local DB schema. Commit the regenerated file alongside any migration. Hand-written types in `@fg/types` mirror the same schema at the _domain_ level (`Patient`, `Tenant`, etc.); generated types are _row-level_ and verbose. Both have a place — generated types catch column-rename bugs at compile time; domain types are what app code passes around.

## Deferred features

### Family-in-the-loop access

The Session 1 plan (Q2/D9) deferred family-member access. No `patient_family_members` table exists, no `family_member` role on memberships, no family RLS branches. The reasoning: different buyer types may already maintain their own family contact lists, and we don't yet know whether to source-of-truth in our DB or sync. When this lands, expect a new migration adding:

- `patient_family_members(tenant_id, patient_id, user_id, relationship, can_view_calls, can_receive_alerts)`
- `family_member` to the `membership_role` enum (or a separate access path that doesn't go through tenant membership)
- Branches in `patients_select`, `call_logs_select`, `alerts_select` policies

### ICD-10 conditions

`patients.conditions` is `text[]` of short codes today (`'chf'`, `'copd'`, etc.). When PBACO or another buyer needs ICD-10 mapping, expect a migration that adds a `conditions_icd10 jsonb` column. The `text[]` column stays for backward compatibility until all consumers migrate.

## Inspecting the live schema

```sh
pnpm db:start          # if not running
docker exec -it supabase_db_FG_B2B psql -U postgres -d postgres
\dt public.*            # list tables
\d+ public.patients     # describe a table
select tablename, rowsecurity, c.relforcerowsecurity
from pg_tables t
join pg_class c on c.relname = t.tablename
where schemaname='public';
```

Studio UI: http://127.0.0.1:54323
