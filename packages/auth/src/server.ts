import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { createServerClient as createSsrServerClient, type CookieOptions } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';

import type { Database } from '@fg/database';
import type { MembershipRole } from '@fg/types';

import { AuthorizationError } from './errors';

export const TENANT_COOKIE = 'fg_tenant_id';

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

export function getServerSupabase() {
  const cookieStore = cookies();
  return createSsrServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: CookieToSet[]) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll from a Server Component is a no-op; middleware handles refresh.
          }
        },
      },
    },
  );
}

export type FgServerSupabase = ReturnType<typeof getServerSupabase>;

export async function getSession(): Promise<User | null> {
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
  // Cast: @supabase/ssr's cookies-adapter generic instantiation occasionally
  // resolves `data` to `never` under exactOptionalPropertyTypes. The runtime
  // shape is correct.
  const isSuperAdmin = (profile as { is_super_admin?: boolean } | null)?.is_super_admin === true;

  if (!tenantId) {
    return {
      userId: user.id,
      tenantId: null,
      tenantSlug: null,
      role: null,
      isSuperAdmin,
    };
  }

  const { data: membership } = await supabase
    .from('user_tenant_memberships')
    .select('role, tenants!inner(slug)')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  const row = membership as { role: MembershipRole; tenants: { slug: string } } | null;

  if (!row) {
    return {
      userId: user.id,
      tenantId: null,
      tenantSlug: null,
      role: null,
      isSuperAdmin,
    };
  }

  return {
    userId: user.id,
    tenantId,
    tenantSlug: row.tenants.slug,
    role: row.role,
    isSuperAdmin,
  };
}

export interface ResolvedTenantContext extends ActiveMembership {
  tenantId: string;
  tenantSlug: string;
  role: MembershipRole;
}

export async function requireTenant(): Promise<ResolvedTenantContext> {
  const m = await getActiveMembership();
  if (!m.tenantId || !m.tenantSlug || !m.role) redirect('/select-tenant');
  return m as ResolvedTenantContext;
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
  if (minRole === 'super_admin') {
    throw new AuthorizationError('Super admin required');
  }
  if (!m.role || ROLE_RANK[m.role] < ROLE_RANK[minRole]) {
    throw new AuthorizationError(`Requires role ${minRole} or higher`);
  }
  return m;
}
