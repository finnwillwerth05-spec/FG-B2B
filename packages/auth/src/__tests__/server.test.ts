import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildMockSupabase, type MockSupabaseConfig } from './__mocks__/supabase';

// --- Module mocks (hoisted by Vitest) ---------------------------------------

const cookieStore = {
  get: vi.fn(),
  getAll: vi.fn(() => []),
  set: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => cookieStore),
}));

class RedirectError extends Error {
  constructor(public path: string) {
    super(`__redirect__:${path}`);
    this.name = 'RedirectError';
  }
}

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new RedirectError(path);
  }),
}));

const mockSupabaseRef: { current: ReturnType<typeof buildMockSupabase> } = {
  current: buildMockSupabase({}),
};

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabaseRef.current),
}));

function setupSupabase(config: MockSupabaseConfig) {
  mockSupabaseRef.current = buildMockSupabase(config);
}

// --- Imports under test (after mocks) ---------------------------------------

const importServer = () => import('../server');

describe('@fg/auth/server', () => {
  beforeEach(() => {
    cookieStore.get.mockReset();
    cookieStore.getAll.mockReset().mockReturnValue([]);
    cookieStore.set.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getSession', () => {
    it('returns null when Supabase reports no user', async () => {
      setupSupabase({ user: null });
      const { getSession } = await importServer();
      expect(await getSession()).toBeNull();
    });

    it('returns the user when authenticated', async () => {
      setupSupabase({ user: { id: 'u1', email: 'a@b.com' } });
      const { getSession } = await importServer();
      expect(await getSession()).toMatchObject({ id: 'u1' });
    });
  });

  describe('requireUser', () => {
    it('redirects to /login when unauthenticated', async () => {
      setupSupabase({ user: null });
      const { requireUser } = await importServer();
      await expect(requireUser()).rejects.toThrow('__redirect__:/login');
    });

    it('returns the user when authenticated', async () => {
      setupSupabase({ user: { id: 'u1', email: 'a@b.com' } });
      const { requireUser } = await importServer();
      const u = await requireUser();
      expect(u.id).toBe('u1');
    });
  });

  describe('getActiveMembership', () => {
    it('returns null tenant when no fg_tenant_id cookie', async () => {
      setupSupabase({
        user: { id: 'u1', email: 'a@b.com' },
        profile: { is_super_admin: false },
      });
      cookieStore.get.mockReturnValue(undefined);
      const { getActiveMembership } = await importServer();
      const m = await getActiveMembership();
      expect(m).toEqual({
        userId: 'u1',
        tenantId: null,
        tenantSlug: null,
        role: null,
        isSuperAdmin: false,
      });
    });

    it('returns full membership when cookie + valid membership exist', async () => {
      setupSupabase({
        user: { id: 'u1', email: 'a@b.com' },
        profile: { is_super_admin: false },
        membership: { role: 'care_team_lead', tenants: { slug: 'pbaco' } },
      });
      cookieStore.get.mockReturnValue({ name: 'fg_tenant_id', value: 't1' });
      const { getActiveMembership } = await importServer();
      const m = await getActiveMembership();
      expect(m).toEqual({
        userId: 'u1',
        tenantId: 't1',
        tenantSlug: 'pbaco',
        role: 'care_team_lead',
        isSuperAdmin: false,
      });
    });

    it('returns isSuperAdmin: true when profile flag is set', async () => {
      setupSupabase({
        user: { id: 'u1', email: 'a@b.com' },
        profile: { is_super_admin: true },
      });
      cookieStore.get.mockReturnValue(undefined);
      const { getActiveMembership } = await importServer();
      const m = await getActiveMembership();
      expect(m.isSuperAdmin).toBe(true);
    });
  });

  describe('requireRole', () => {
    it('passes when caller is super admin (any role required)', async () => {
      setupSupabase({
        user: { id: 'u1', email: 'a@b.com' },
        profile: { is_super_admin: true },
      });
      cookieStore.get.mockReturnValue(undefined);
      const { requireRole } = await importServer();
      await expect(requireRole('tenant_admin')).resolves.toMatchObject({ isSuperAdmin: true });
    });

    it('passes when caller is super admin and super_admin is required', async () => {
      setupSupabase({
        user: { id: 'u1', email: 'a@b.com' },
        profile: { is_super_admin: true },
      });
      cookieStore.get.mockReturnValue(undefined);
      const { requireRole } = await importServer();
      await expect(requireRole('super_admin')).resolves.toMatchObject({ isSuperAdmin: true });
    });

    it('throws when non-super-admin requests super_admin', async () => {
      setupSupabase({
        user: { id: 'u1', email: 'a@b.com' },
        profile: { is_super_admin: false },
        membership: { role: 'tenant_admin', tenants: { slug: 'pbaco' } },
      });
      cookieStore.get.mockReturnValue({ name: 'fg_tenant_id', value: 't1' });
      const { requireRole } = await importServer();
      await expect(requireRole('super_admin')).rejects.toThrow(/Super admin required/);
    });

    it('throws when caller is care_team_member and care_team_lead is required', async () => {
      setupSupabase({
        user: { id: 'u1', email: 'a@b.com' },
        profile: { is_super_admin: false },
        membership: { role: 'care_team_member', tenants: { slug: 'pbaco' } },
      });
      cookieStore.get.mockReturnValue({ name: 'fg_tenant_id', value: 't1' });
      const { requireRole } = await importServer();
      await expect(requireRole('care_team_lead')).rejects.toThrow(
        /Requires role care_team_lead or higher/,
      );
    });

    it('passes when caller is tenant_admin and care_team_lead is required', async () => {
      setupSupabase({
        user: { id: 'u1', email: 'a@b.com' },
        profile: { is_super_admin: false },
        membership: { role: 'tenant_admin', tenants: { slug: 'pbaco' } },
      });
      cookieStore.get.mockReturnValue({ name: 'fg_tenant_id', value: 't1' });
      const { requireRole } = await importServer();
      await expect(requireRole('care_team_lead')).resolves.toMatchObject({ role: 'tenant_admin' });
    });
  });
});
