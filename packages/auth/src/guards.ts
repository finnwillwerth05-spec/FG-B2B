import type { SupabaseClient, User } from '@supabase/supabase-js';

import type { MembershipRole } from '@fg/types';

import { AuthorizationError, UnauthenticatedError } from './errors.js';

const ROLE_HIERARCHY: Record<MembershipRole, number> = {
  care_team_member: 1,
  care_team_lead: 2,
  tenant_admin: 3,
};

// Untyped client signature: the generated Database type is a placeholder until
// `pnpm db:types` runs (Task 11). Once regenerated, callers can pass a
// `SupabaseClient<Database>` and TS will accept it via structural widening.
type Client = SupabaseClient;

export async function requireUser(supabase: Client): Promise<User> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new UnauthenticatedError();
  }
  return user;
}

export async function requireSuperAdmin(supabase: Client): Promise<User> {
  const user = await requireUser(supabase);
  const { data, error } = await supabase
    .from('user_profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle();

  const isSuperAdmin = (data as { is_super_admin?: boolean } | null)?.is_super_admin === true;
  if (error || !isSuperAdmin) {
    throw new AuthorizationError('Super admin required');
  }
  return user;
}

export async function requireRole(
  supabase: Client,
  tenantId: string,
  minRole: MembershipRole,
): Promise<{ user: User; role: MembershipRole }> {
  const user = await requireUser(supabase);

  const { data, error } = await supabase
    .from('user_tenant_memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  const row = data as { role?: MembershipRole } | null;
  if (error || !row?.role) {
    throw new AuthorizationError('No active membership in tenant');
  }

  if (ROLE_HIERARCHY[row.role] < ROLE_HIERARCHY[minRole]) {
    throw new AuthorizationError(
      `Role '${row.role}' insufficient (requires '${minRole}' or higher)`,
    );
  }

  return { user, role: row.role };
}
