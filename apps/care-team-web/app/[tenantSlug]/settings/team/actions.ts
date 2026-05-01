'use server';

import { createHash, randomBytes } from 'node:crypto';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { z } from 'zod';

import { getServerSupabase, requireRole, requireTenant } from '@fg/auth/server';
import { createServiceRoleClient } from '@fg/database';
import { InviteEmail, sendEmail } from '@fg/email';

import { INVITE_EXPIRY_DAYS, INVITE_TOKEN_BYTES } from '@/lib/constants';

export interface InviteUserState {
  error?: string;
  sent?: { email: string; role: string };
}

const Schema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(['tenant_admin', 'care_team_lead', 'care_team_member']),
});

export async function inviteUser(
  _prev: InviteUserState,
  formData: FormData,
): Promise<InviteUserState> {
  const m = await requireTenant();
  await requireRole('tenant_admin');

  const parsed = Schema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const email = parsed.data.email.trim().toLowerCase();

  // Q2 default: reject if user is already a member of this tenant.
  const supabase = getServerSupabase();
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id, user_tenant_memberships!inner(tenant_id)')
    .eq('email', email)
    .eq('user_tenant_memberships.tenant_id', m.tenantId)
    .is('user_tenant_memberships.deleted_at', null)
    .maybeSingle();
  if (existing) {
    return { error: 'That email is already a member of this tenant.' };
  }

  // Reject duplicate pending invites (the unique partial index would also
  // catch this, but a pre-check produces a friendlier message).
  const { data: pending } = await supabase
    .from('tenant_invites')
    .select('id')
    .eq('tenant_id', m.tenantId)
    .eq('email', email)
    .is('accepted_at', null)
    .is('deleted_at', null)
    .maybeSingle();
  if (pending) {
    return { error: 'An invite for that email is already pending.' };
  }

  const tokenPlain = randomBytes(INVITE_TOKEN_BYTES).toString('base64url');
  const tokenHash = createHash('sha256').update(tokenPlain).digest('hex');
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 86_400_000).toISOString();

  const adminClient = createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { error: inviteErr } = await adminClient.from('tenant_invites').insert({
    tenant_id: m.tenantId,
    email,
    role: parsed.data.role,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });
  if (inviteErr) return { error: inviteErr.message };

  // Tenant name for email body.
  const { data: tenantRow } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', m.tenantId)
    .maybeSingle();
  const tenantName = (tenantRow as { name?: string } | null)?.name ?? 'your tenant';

  const origin =
    headers().get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  await sendEmail({
    to: email,
    subject: `You've been invited to ${tenantName} on Family Guardian`,
    react: InviteEmail({
      tenantName,
      inviterName: 'A teammate',
      role: parsed.data.role.replace('_', ' '),
      acceptUrl: `${origin}/accept-invite/${tokenPlain}`,
      expiresInDays: INVITE_EXPIRY_DAYS,
    }),
  });

  revalidatePath(`/${m.tenantSlug}/settings/team`);
  return { sent: { email, role: parsed.data.role } };
}
