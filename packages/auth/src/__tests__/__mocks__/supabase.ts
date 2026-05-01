import { vi } from 'vitest';

export interface MockSupabaseUser {
  id: string;
  email: string;
}

export interface MockProfileRow {
  is_super_admin: boolean;
}

export interface MockMembershipRow {
  role: string;
  tenants: { slug: string };
}

export interface MockSupabaseConfig {
  user?: MockSupabaseUser | null;
  profile?: MockProfileRow | null;
  membership?: MockMembershipRow | null;
}

export interface MockSupabase {
  auth: { getUser: ReturnType<typeof vi.fn> };
  from: ReturnType<typeof vi.fn>;
}

function makeQueryBuilder(returnData: unknown) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.is = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(async () => ({ data: returnData, error: null }));
  return builder;
}

export function buildMockSupabase(config: MockSupabaseConfig): MockSupabase {
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: config.user ?? null },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'user_profiles') return makeQueryBuilder(config.profile ?? null);
      if (table === 'user_tenant_memberships') return makeQueryBuilder(config.membership ?? null);
      return makeQueryBuilder(null);
    }),
  };
}
