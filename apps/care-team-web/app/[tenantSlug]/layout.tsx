import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { getServerSupabase, requireTenant, requireUser } from '@fg/auth/server';

import { AppShell } from '@/components/app-shell';
import type { TenantOption } from '@/components/tenant-switcher';

interface MembershipRow {
  tenant_id: string;
  role: string;
  tenants: { name: string; slug: string };
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { tenantSlug: string };
}) {
  const m = await requireTenant();
  if (m.tenantSlug !== params.tenantSlug) {
    redirect(`/${m.tenantSlug}/dashboard`);
  }

  const user = await requireUser();
  const supabase = getServerSupabase();

  const [{ data: profileRow }, { data: tenantRow }, { data: membershipsRows }] = await Promise.all([
    supabase.from('user_profiles').select('display_name, email').eq('id', user.id).maybeSingle(),
    supabase.from('tenants').select('id, name').eq('id', m.tenantId).maybeSingle(),
    supabase
      .from('user_tenant_memberships')
      .select('tenant_id, role, tenants!inner(name, slug)')
      .eq('user_id', user.id)
      .is('deleted_at', null),
  ]);

  const profile = profileRow as { display_name: string; email: string | null } | null;
  const tenant = tenantRow as { id: string; name: string } | null;
  const memberships = (membershipsRows ?? []) as unknown as MembershipRow[];

  if (!tenant) redirect('/select-tenant');

  const options: TenantOption[] = memberships.map((row) => ({
    tenantId: row.tenant_id,
    tenantName: row.tenants.name,
    tenantSlug: row.tenants.slug,
    role: row.role,
  }));

  return (
    <AppShell
      active={{ tenantId: tenant.id, tenantName: tenant.name }}
      options={options}
      user={{
        displayName: profile?.display_name ?? user.email ?? 'User',
        email: profile?.email ?? user.email ?? null,
      }}
    >
      {children}
    </AppShell>
  );
}
