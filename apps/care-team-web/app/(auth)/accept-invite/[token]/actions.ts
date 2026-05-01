'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getServerSupabase } from '@fg/auth/server';
import { createServiceRoleClient } from '@fg/database';

import { TENANT_COOKIE, TENANT_COOKIE_MAX_AGE } from '@/lib/constants';

export interface AcceptInviteState {
  error?: string;
}

export async function acceptInvite(
  _prev: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const token = String(formData.get('token') ?? '');
  const password = String(formData.get('password') ?? '');
  const displayName = String(formData.get('displayName') ?? '').trim();

  if (!token) return { error: 'Missing invite token' };
  if (!displayName || displayName.length < 2) {
    return { error: 'Display name must be at least 2 characters' };
  }
  if (!password || password.length < 8) {
    return { error: 'Password must be at least 8 characters' };
  }

  const adminClient = createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 1. Look up the invite (security definer RPC; works for anon).
  const { data: previewRows, error: previewErr } = await adminClient.rpc('get_invite_by_token', {
    p_token: token,
  });
  if (previewErr) return { error: previewErr.message };
  const preview = (
    previewRows as
      | {
          tenant_id: string;
          tenant_name: string;
          tenant_slug: string;
          email: string;
          role: string;
          expires_at: string;
          accepted_at: string | null;
        }[]
      | null
  )?.[0];
  if (!preview) return { error: 'This invite link is invalid.' };
  if (preview.accepted_at) return { error: 'This invite has already been used.' };
  if (new Date(preview.expires_at).getTime() <= Date.now()) {
    return { error: 'This invite has expired.' };
  }

  // 2. Create the auth user (idempotent: if email exists, fetch instead).
  let userId: string;
  const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
    email: preview.email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (createErr) {
    if (/registered|exists/i.test(createErr.message)) {
      // Find the existing user and update their password + display_name.
      const { data: list } = await adminClient.auth.admin.listUsers();
      const existing = list.users.find(
        (u) => u.email?.toLowerCase() === preview.email.toLowerCase(),
      );
      if (!existing) return { error: 'Could not resolve existing user' };
      userId = existing.id;
      const { error: updErr } = await adminClient.auth.admin.updateUserById(userId, {
        password,
        user_metadata: { display_name: displayName },
      });
      if (updErr) return { error: updErr.message };
    } else {
      return { error: createErr.message };
    }
  } else {
    userId = created.user.id;
  }

  // 3. Run the SQL function to write membership + mark invite accepted.
  const { error: rpcErr } = await adminClient.rpc('accept_invite', {
    p_token: token,
    p_user_id: userId,
    p_display_name: displayName,
  });
  if (rpcErr) {
    // Roll back the auth user we just created (only on the create path).
    if (created) {
      await adminClient.auth.admin.deleteUser(userId);
    }
    return { error: rpcErr.message };
  }

  // 4. Sign the new user in via the user-session client.
  const userClient = getServerSupabase();
  const { error: signInErr } = await userClient.auth.signInWithPassword({
    email: preview.email,
    password,
  });
  if (signInErr) return { error: signInErr.message };

  // 5. Set the active tenant cookie + redirect to the tenant's dashboard.
  cookies().set(TENANT_COOKIE, preview.tenant_id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TENANT_COOKIE_MAX_AGE,
    path: '/',
  });

  redirect(`/${preview.tenant_slug}/dashboard`);
}
