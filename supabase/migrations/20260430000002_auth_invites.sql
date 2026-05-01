-- =============================================================================
-- Session 2: tenant_invites table, slug column on tenants, accept_invite RPC,
-- and an auth.users → user_profiles sync trigger.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. Add slug to tenants (kebab-case, unique, used in URLs)
--    Add via nullable + default '', backfill, then enforce NOT NULL + UNIQUE.
-- ----------------------------------------------------------------------------
alter table public.tenants
  add column slug text not null default '';

update public.tenants
   set slug = 'palm-beach-aco'
 where name = 'Palm Beach ACO';

alter table public.tenants
  alter column slug drop default;

create unique index tenants_slug_unique on public.tenants(slug)
  where deleted_at is null;

-- ----------------------------------------------------------------------------
-- 2. Add email to user_profiles, mirrored from auth.users via trigger.
--    Lets team-settings show "alice@acme.org" without joining auth.users on
--    every page load.
-- ----------------------------------------------------------------------------
alter table public.user_profiles
  add column email text;

create index user_profiles_email_idx on public.user_profiles(lower(email))
  where deleted_at is null;

-- ----------------------------------------------------------------------------
-- 3. Trigger that keeps user_profiles in sync with auth.users on insert/update.
--    On insert: creates the profile row if it doesn't exist (display_name from
--    user_metadata when supplied, falling back to the email local-part).
--    On email change: updates the mirrored email column.
-- ----------------------------------------------------------------------------
create or replace function public.handle_auth_user_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_display_name text;
begin
  resolved_display_name := coalesce(
    nullif(new.raw_user_meta_data->>'display_name', ''),
    split_part(new.email, '@', 1)
  );

  insert into public.user_profiles (id, display_name, email)
  values (new.id, resolved_display_name, new.email)
  on conflict (id) do update
    set email = excluded.email,
        display_name = case
          when public.user_profiles.display_name is null
            or public.user_profiles.display_name = ''
            or public.user_profiles.display_name = split_part(public.user_profiles.email, '@', 1)
          then excluded.display_name
          else public.user_profiles.display_name
        end;

  return new;
end;
$$;

create trigger on_auth_user_change
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_auth_user_change();

-- Backfill existing auth.users into user_profiles. Belt-and-suspenders for
-- environments where users were created before the trigger existed.
insert into public.user_profiles (id, display_name, email)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data->>'display_name', ''), split_part(u.email, '@', 1)),
  u.email
from auth.users u
on conflict (id) do update
  set email = excluded.email;

-- ----------------------------------------------------------------------------
-- 4. tenant_invites table
-- ----------------------------------------------------------------------------
create table public.tenant_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text not null,
  role membership_role not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id)
);

-- Prevent duplicate pending invites to the same email in the same tenant.
create unique index tenant_invites_pending_unique
  on public.tenant_invites(tenant_id, lower(email))
  where accepted_at is null and deleted_at is null;

create index tenant_invites_tenant_idx on public.tenant_invites(tenant_id)
  where deleted_at is null;

create trigger tenant_invites_set_updated_at
  before update on public.tenant_invites
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. accept_invite — security-definer function that turns an invite into a
--    membership in one transaction. Caller (server action) must have already
--    created the auth.user with id = p_user_id. We trust that — the server
--    action uses the service-role client and is the only invocation path.
--
--    Raises one of:
--      INVITE_NOT_FOUND      — token doesn't match any row
--      INVITE_EXPIRED        — past expires_at
--      INVITE_ALREADY_ACCEPTED — accepted_at is not null
--    on the happy path returns the tenant_id (for redirect).
-- ----------------------------------------------------------------------------
create or replace function public.accept_invite(
  p_token text,
  p_user_id uuid,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token_hash text;
  v_invite public.tenant_invites%rowtype;
begin
  v_token_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  select * into v_invite
    from public.tenant_invites
   where token_hash = v_token_hash
     and deleted_at is null
   for update;

  if not found then
    raise exception 'INVITE_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_invite.accepted_at is not null then
    raise exception 'INVITE_ALREADY_ACCEPTED' using errcode = 'P0001';
  end if;

  if v_invite.expires_at <= now() then
    raise exception 'INVITE_EXPIRED' using errcode = 'P0001';
  end if;

  -- Ensure user_profiles row exists with the chosen display_name.
  insert into public.user_profiles (id, display_name)
  values (p_user_id, p_display_name)
  on conflict (id) do update
    set display_name = excluded.display_name;

  insert into public.user_tenant_memberships (user_id, tenant_id, role, status)
  values (p_user_id, v_invite.tenant_id, v_invite.role, 'active')
  on conflict (user_id, tenant_id) do nothing;

  update public.tenant_invites
     set accepted_at = now()
   where id = v_invite.id;

  return v_invite.tenant_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. get_invite_by_token — public-safe preview for the accept-invite page.
--    Anonymous callers can pass a plaintext token to see what they're being
--    invited to (tenant name, role, expiry). Never returns the token hash.
--
--    pgcrypto's digest() lives in the `extensions` schema in Supabase's
--    default config, so we qualify it explicitly and add `extensions` to the
--    function's search_path.
-- ----------------------------------------------------------------------------
create or replace function public.get_invite_by_token(p_token text)
returns table (
  tenant_id uuid,
  tenant_name text,
  tenant_slug text,
  email text,
  role membership_role,
  expires_at timestamptz,
  accepted_at timestamptz
)
language sql
security definer
set search_path = public, extensions
as $$
  select
    t.id as tenant_id,
    t.name as tenant_name,
    t.slug as tenant_slug,
    i.email,
    i.role,
    i.expires_at,
    i.accepted_at
  from public.tenant_invites i
  join public.tenants t on t.id = i.tenant_id
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and i.deleted_at is null;
$$;

-- ----------------------------------------------------------------------------
-- 7. RLS on tenant_invites
-- ----------------------------------------------------------------------------
alter table public.tenant_invites enable row level security;
alter table public.tenant_invites force row level security;

create policy tenant_invites_select on public.tenant_invites
  for select using (
    public.auth_user_is_super_admin()
    or public.auth_user_role_in_tenant(tenant_id) = 'tenant_admin'
  );

create policy tenant_invites_insert on public.tenant_invites
  for insert with check (
    public.auth_user_is_super_admin()
    or public.auth_user_role_in_tenant(tenant_id) = 'tenant_admin'
  );

create policy tenant_invites_update on public.tenant_invites
  for update using (
    public.auth_user_is_super_admin()
    or public.auth_user_role_in_tenant(tenant_id) = 'tenant_admin'
  )
  with check (
    public.auth_user_is_super_admin()
    or public.auth_user_role_in_tenant(tenant_id) = 'tenant_admin'
  );

-- Anonymous callers cannot read tenant_invites directly; they go through
-- get_invite_by_token() which is security-definer. Grant execute on the helper
-- functions explicitly so the anon role can call them.
grant execute on function public.get_invite_by_token(text) to anon, authenticated;
grant execute on function public.accept_invite(text, uuid, text) to authenticated, service_role;
