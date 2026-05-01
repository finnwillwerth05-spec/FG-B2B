'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getServerSupabase, requireUser } from '@fg/auth/server';

import { TENANT_COOKIE, TENANT_COOKIE_MAX_AGE } from '@/lib/constants';

export async function selectTenant(formData: FormData): Promise<void> {
  const user = await requireUser();
  const tenantId = String(formData.get('tenantId') ?? '');
  if (!tenantId) return;

  const supabase = getServerSupabase();
  const { data: membership } = await supabase
    .from('user_tenant_memberships')
    .select('role, tenants!inner(slug)')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  const row = membership as { role: string; tenants: { slug: string } } | null;
  if (!row) return;

  cookies().set(TENANT_COOKIE, tenantId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TENANT_COOKIE_MAX_AGE,
    path: '/',
  });

  redirect(`/${row.tenants.slug}/dashboard`);
}
