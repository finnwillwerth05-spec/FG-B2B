-- =============================================================================
-- Family Guardian B2B — initial schema
-- Multi-tenant via tenant_id + Row-Level Security on every domain table.
-- Audit columns + soft delete on every table. Service-role connection bypasses
-- RLS (BYPASSRLS) for system jobs; user-facing code goes through anon/authenticated.
-- =============================================================================

create extension if not exists "pgcrypto";

-- =============================================================================
-- Enums
-- =============================================================================
create type tenant_type as enum (
  'aco', 'ma_plan', 'physician_group', 'home_health', 'snf'
);

create type membership_role as enum (
  'tenant_admin', 'care_team_lead', 'care_team_member'
);

create type membership_status as enum ('active', 'invited', 'suspended');

create type patient_status as enum (
  'active', 'paused', 'discharged', 'deceased'
);

create type risk_tier as enum ('low', 'medium', 'high', 'very_high');

create type call_status as enum (
  'scheduled', 'in_progress', 'completed', 'no_answer', 'failed', 'voicemail'
);

create type call_cadence as enum ('daily', 'weekdays', 'custom');

create type engagement_level as enum ('high', 'moderate', 'low', 'refused');

create type alert_severity as enum ('low', 'medium', 'high', 'critical');

create type alert_type as enum ('clinical', 'behavioral', 'safety', 'operational');

create type alert_status as enum (
  'open', 'acknowledged', 'escalated', 'resolved', 'dismissed'
);

create type care_action_type as enum (
  'acknowledge', 'comment', 'escalate', 'resolve', 'dismiss', 'schedule_visit', 'contact_patient'
);

create type outcome_report_type as enum ('monthly', 'quarterly', 'annual', 'adhoc');

-- =============================================================================
-- Updated_at trigger function (shared by every table)
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- 1. tenants
-- =============================================================================
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type tenant_type not null,
  cohort_definition jsonb not null default '{}'::jsonb,
  outcome_metrics jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id)
);
create trigger tenants_set_updated_at
  before update on public.tenants
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 2. user_profiles  (extends auth.users)
-- =============================================================================
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  phone text,
  is_super_admin boolean not null default false,
  default_locale text not null default 'en-US',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id)
);
create trigger user_profiles_set_updated_at
  before update on public.user_profiles
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 3. user_tenant_memberships  (which user is in which tenant, with what role)
-- =============================================================================
create table public.user_tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role membership_role not null,
  status membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  unique (user_id, tenant_id)
);
create index user_tenant_memberships_user_id_idx
  on public.user_tenant_memberships(user_id);
create index user_tenant_memberships_tenant_id_idx
  on public.user_tenant_memberships(tenant_id);
create trigger user_tenant_memberships_set_updated_at
  before update on public.user_tenant_memberships
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 4. patients
-- conditions[] is short-codes for now ('chf','copd',…). ICD-10 mapping deferred
-- to a future migration once the PBACO pilot needs it (plan D10).
-- =============================================================================
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  external_mrn text,
  first_name text not null,
  last_name text not null,
  dob date not null,
  sex text not null check (sex in ('male', 'female', 'other', 'unknown')),
  phone text not null,
  address jsonb,
  conditions text[] not null default '{}',
  primary_dx text,
  risk_tier risk_tier not null default 'medium',
  status patient_status not null default 'active',
  enrolled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id)
);
create unique index patients_tenant_mrn_unique
  on public.patients(tenant_id, external_mrn)
  where deleted_at is null and external_mrn is not null;
create index patients_tenant_status_idx
  on public.patients(tenant_id, status)
  where deleted_at is null;
create index patients_tenant_name_idx
  on public.patients(tenant_id, lower(last_name), lower(first_name));
create trigger patients_set_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 5. call_schedules
-- =============================================================================
create table public.call_schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  cadence call_cadence not null,
  days_of_week int[] not null default '{}',
  time_of_day time not null,
  timezone text not null,
  active boolean not null default true,
  start_date date not null default current_date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id)
);
create index call_schedules_patient_idx on public.call_schedules(patient_id) where deleted_at is null;
create trigger call_schedules_set_updated_at
  before update on public.call_schedules
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 6. call_logs
-- =============================================================================
create table public.call_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  scheduled_at timestamptz not null,
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds int,
  status call_status not null default 'scheduled',
  transcript text,
  recording_url text,
  voice_provider text,
  provider_call_id text,
  agent_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id)
);
create index call_logs_tenant_patient_scheduled_idx
  on public.call_logs(tenant_id, patient_id, scheduled_at desc);
create index call_logs_status_scheduled_idx
  on public.call_logs(status, scheduled_at)
  where status in ('scheduled', 'in_progress');
create trigger call_logs_set_updated_at
  before update on public.call_logs
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 7. call_analyses
-- =============================================================================
create table public.call_analyses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  call_log_id uuid not null unique references public.call_logs(id) on delete cascade,
  mood_score numeric(3, 1),
  cognitive_score numeric(3, 1),
  physical_flags text[] not null default '{}',
  cognitive_flags text[] not null default '{}',
  emotional_flags text[] not null default '{}',
  safety_alerts text[] not null default '{}',
  engagement_level engagement_level,
  summary text,
  key_topics text[] not null default '{}',
  follow_up_items text[] not null default '{}',
  compared_to_previous text,
  raw_response jsonb,
  model_id text,
  analyzed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id)
);
create trigger call_analyses_set_updated_at
  before update on public.call_analyses
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 8. alerts
-- =============================================================================
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  call_log_id uuid references public.call_logs(id) on delete set null,
  severity alert_severity not null,
  type alert_type not null,
  message text not null,
  status alert_status not null default 'open',
  acknowledged_by uuid references auth.users(id),
  acknowledged_at timestamptz,
  escalated_to uuid[] not null default '{}',
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id)
);
create index alerts_tenant_status_idx
  on public.alerts(tenant_id, status, severity, created_at desc)
  where status in ('open', 'escalated');
create trigger alerts_set_updated_at
  before update on public.alerts
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 9. care_team_actions
-- =============================================================================
create table public.care_team_actions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  alert_id uuid not null references public.alerts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action care_action_type not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id)
);
create index care_team_actions_alert_idx on public.care_team_actions(alert_id);
create trigger care_team_actions_set_updated_at
  before update on public.care_team_actions
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 10. outcome_reports
-- =============================================================================
create table public.outcome_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  report_type outcome_report_type not null,
  metrics jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  generated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id)
);
create index outcome_reports_tenant_period_idx
  on public.outcome_reports(tenant_id, period_start, period_end);
create trigger outcome_reports_set_updated_at
  before update on public.outcome_reports
  for each row execute function public.set_updated_at();

-- =============================================================================
-- RLS helper functions
-- security definer + fixed search_path so they bypass RLS on the lookup tables
-- when called from a policy context.
-- =============================================================================
create or replace function public.auth_user_tenants()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id
  from public.user_tenant_memberships
  where user_id = auth.uid()
    and status = 'active'
    and deleted_at is null;
$$;

create or replace function public.auth_user_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_super_admin from public.user_profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.auth_user_role_in_tenant(p_tenant_id uuid)
returns membership_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.user_tenant_memberships
  where user_id = auth.uid()
    and tenant_id = p_tenant_id
    and status = 'active'
    and deleted_at is null
  limit 1;
$$;

-- =============================================================================
-- Enable + force RLS
-- =============================================================================
alter table public.tenants enable row level security;
alter table public.tenants force row level security;
alter table public.user_profiles enable row level security;
alter table public.user_profiles force row level security;
alter table public.user_tenant_memberships enable row level security;
alter table public.user_tenant_memberships force row level security;
alter table public.patients enable row level security;
alter table public.patients force row level security;
alter table public.call_schedules enable row level security;
alter table public.call_schedules force row level security;
alter table public.call_logs enable row level security;
alter table public.call_logs force row level security;
alter table public.call_analyses enable row level security;
alter table public.call_analyses force row level security;
alter table public.alerts enable row level security;
alter table public.alerts force row level security;
alter table public.care_team_actions enable row level security;
alter table public.care_team_actions force row level security;
alter table public.outcome_reports enable row level security;
alter table public.outcome_reports force row level security;

-- =============================================================================
-- RLS policies
-- =============================================================================

-- tenants ---------------------------------------------------------------------
create policy tenants_select on public.tenants
  for select using (
    public.auth_user_is_super_admin()
    or id in (select public.auth_user_tenants())
  );
create policy tenants_insert on public.tenants
  for insert with check (public.auth_user_is_super_admin());
create policy tenants_update on public.tenants
  for update using (
    public.auth_user_is_super_admin()
    or public.auth_user_role_in_tenant(id) = 'tenant_admin'
  )
  with check (
    public.auth_user_is_super_admin()
    or public.auth_user_role_in_tenant(id) = 'tenant_admin'
  );

-- user_profiles ---------------------------------------------------------------
create policy user_profiles_select on public.user_profiles
  for select using (public.auth_user_is_super_admin() or id = auth.uid());
create policy user_profiles_insert on public.user_profiles
  for insert with check (id = auth.uid());
create policy user_profiles_update on public.user_profiles
  for update using (id = auth.uid() or public.auth_user_is_super_admin());

-- user_tenant_memberships -----------------------------------------------------
create policy memberships_select on public.user_tenant_memberships
  for select using (
    public.auth_user_is_super_admin()
    or user_id = auth.uid()
    or tenant_id in (select public.auth_user_tenants())
  );
create policy memberships_insert on public.user_tenant_memberships
  for insert with check (
    public.auth_user_is_super_admin()
    or public.auth_user_role_in_tenant(tenant_id) = 'tenant_admin'
  );
create policy memberships_update on public.user_tenant_memberships
  for update using (
    public.auth_user_is_super_admin()
    or public.auth_user_role_in_tenant(tenant_id) = 'tenant_admin'
  );

-- patients --------------------------------------------------------------------
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

-- call_schedules --------------------------------------------------------------
create policy call_schedules_all on public.call_schedules
  for all
  using (
    public.auth_user_is_super_admin()
    or tenant_id in (select public.auth_user_tenants())
  )
  with check (
    public.auth_user_is_super_admin()
    or tenant_id in (select public.auth_user_tenants())
  );

-- call_logs (read-only for users; writes via service role) -------------------
create policy call_logs_select on public.call_logs
  for select using (
    public.auth_user_is_super_admin()
    or tenant_id in (select public.auth_user_tenants())
  );

-- call_analyses (read-only for users; writes via service role) ----------------
create policy call_analyses_select on public.call_analyses
  for select using (
    public.auth_user_is_super_admin()
    or tenant_id in (select public.auth_user_tenants())
  );

-- alerts ----------------------------------------------------------------------
create policy alerts_select on public.alerts
  for select using (
    public.auth_user_is_super_admin()
    or tenant_id in (select public.auth_user_tenants())
  );
create policy alerts_update on public.alerts
  for update using (
    public.auth_user_is_super_admin()
    or tenant_id in (select public.auth_user_tenants())
  )
  with check (
    public.auth_user_is_super_admin()
    or tenant_id in (select public.auth_user_tenants())
  );

-- care_team_actions -----------------------------------------------------------
create policy care_team_actions_select on public.care_team_actions
  for select using (
    public.auth_user_is_super_admin()
    or tenant_id in (select public.auth_user_tenants())
  );
create policy care_team_actions_insert on public.care_team_actions
  for insert with check (
    user_id = auth.uid()
    and tenant_id in (select public.auth_user_tenants())
  );

-- outcome_reports -------------------------------------------------------------
create policy outcome_reports_select on public.outcome_reports
  for select using (
    public.auth_user_is_super_admin()
    or tenant_id in (select public.auth_user_tenants())
  );
create policy outcome_reports_insert on public.outcome_reports
  for insert with check (public.auth_user_is_super_admin());
