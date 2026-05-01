'use server';

import { headers } from 'next/headers';

import { createServiceRoleClient } from '@fg/database';
import { ResetPasswordEmail, sendEmail } from '@fg/email';

export interface ForgotPasswordState {
  sent?: boolean;
  error?: string;
}

export async function forgotPassword(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { error: 'Email is required.' };

  const origin =
    headers().get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const adminClient = createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${origin}/reset-password` },
  });

  // Don't reveal whether the email exists. If generateLink errors with
  // user-not-found, return success anyway.
  if (error) {
    if (/not.*found|invalid.*email/i.test(error.message)) {
      return { sent: true };
    }
    return { error: error.message };
  }

  const actionLink = data.properties?.action_link;
  if (!actionLink) return { error: 'Could not generate reset link' };

  await sendEmail({
    to: email,
    subject: 'Reset your Family Guardian password',
    react: ResetPasswordEmail({ resetUrl: actionLink, expiresInMinutes: 60 }),
  });

  return { sent: true };
}
