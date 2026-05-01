import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@fg/ui';

import { createServiceRoleClient } from '@fg/database';

import { AcceptInviteForm } from '@/components/forms/accept-invite-form';

interface InvitePreview {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
}

export default async function AcceptInvitePage({ params }: { params: { token: string } }) {
  const adminClient = createServiceRoleClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data, error } = await adminClient.rpc('get_invite_by_token', {
    p_token: params.token,
  });
  const preview = (data as InvitePreview[] | null)?.[0];

  if (error || !preview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invite link not found</CardTitle>
          <CardDescription>
            This invite link is invalid or has been deleted. Ask the person who invited you to send
            a new one.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (preview.accepted_at) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invite already accepted</CardTitle>
          <CardDescription>
            This invite has already been used. Use the{' '}
            <a href="/login" className="text-primary underline-offset-2 hover:underline">
              sign-in page
            </a>{' '}
            instead.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (new Date(preview.expires_at).getTime() <= Date.now()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invite expired</CardTitle>
          <CardDescription>
            This invite link has expired. Ask the person who invited you to send a new one.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome to {preview.tenant_name}</CardTitle>
        <CardDescription>
          You&apos;ve been invited as a {preview.role.replace('_', ' ')}. Set up your account to
          continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AcceptInviteForm token={params.token} email={preview.email} />
      </CardContent>
    </Card>
  );
}
