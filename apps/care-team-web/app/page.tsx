import { redirect } from 'next/navigation';

import { getActiveMembership } from '@fg/auth/server';

export default async function RootPage() {
  const m = await getActiveMembership();
  if (m.isSuperAdmin && !m.tenantId) redirect('/admin');
  if (!m.tenantId || !m.tenantSlug) redirect('/select-tenant');
  redirect(`/${m.tenantSlug}/dashboard`);
}
