'use server';

import { createHash, randomBytes } from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { z } from 'zod';

import { getServerSupabase, requireRole } from '@fg/auth/server';
import { createServiceRoleClient } from '@fg/database';
import { InviteEmail, sendEmail } from '@fg/email';

import { INVITE_EXPIRY_DAYS, INVITE_TOKEN_BYTES } from '@/lib/constants';
import { deriveUniqueSlug } from '@/lib/derive-slug';

export interface CreateTenantState {
  error?: string;
}

const Schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  type: z.enum(['aco', 'ma_plan', 'physician_group', 'home_health', 'snf']),
  initialAdminEmail: z.string().email('Enter a valid email'),
});

export async function createTenant(
  _prev: CreateTenantState,
  formData: FormData,
): Promise<CreateTenantState> {
  await requireRole('super_admin');

  const parsed = Schema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    initialAdminEmail: formData.get('initialAdminEmail'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const supabase = getServerSupabase();

  const slug = await deriveUniqueSlug(parsed.data.name, async (s) => {
    const { count, error } = await supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .eq('slug', s);
    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
  });

  // Cast insert payload: @supabase/ssr generic propagation through the cookies
  // adapter resolves table writes to `never` under exactOptionalPropertyTypes.
  const insert = await supabase
    .from('tenants')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ name: parsed.data.name, slug, type: parsed.data.type } as any)
    .select('id, name, slug')
    .single();
  const tenant = insert.data as { id: string; name: string; slug: string } | null;
  if (insert.error || !tenant) {
    return { error: insert.error?.message ?? 'Could not create tenant' };
  }

  const tokenPlain = randomBytes(INVITE_TOKEN_BYTES).toString('base64url');
  const tokenHash = createHash('sha256').update(tokenPlain).digest('hex');
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 86_400_000).toISOString();

  // Invite insert needs to bypass the standard tenant_admin RLS check (the
  // super admin doesn't have a membership in this brand-new tenant). Use
  // service-role for the insert.
  const adminClient = createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { error: inviteErr } = await adminClient.from('tenant_invites').insert({
    tenant_id: tenant.id,
    email: parsed.data.initialAdminEmail,
    role: 'tenant_admin',
    token_hash: tokenHash,
    expires_at: expiresAt,
  });
  if (inviteErr) return { error: inviteErr.message };

  const origin =
    headers().get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  await sendEmail({
    to: parsed.data.initialAdminEmail,
    subject: `You've been invited to ${tenant.name} on Family Guardian`,
    react: InviteEmail({
      tenantName: tenant.name,
      inviterName: 'Family Guardian',
      role: 'tenant admin',
      acceptUrl: `${origin}/accept-invite/${tokenPlain}`,
      expiresInDays: INVITE_EXPIRY_DAYS,
    }),
  });

  redirect(`/admin?created=${tenant.slug}`);
}
