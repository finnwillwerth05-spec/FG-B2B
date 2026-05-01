import { redirect } from 'next/navigation';

import { getActiveMembership, getServerSupabase, requireUser } from '@fg/auth/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@fg/ui';

import { InviteUserForm } from '@/components/forms/invite-user-form';

interface MemberRow {
  id: string;
  role: string;
  status: string;
  user_profiles: { display_name: string | null; email: string | null };
}

interface InviteRow {
  id: string;
  email: string;
  role: string;
  expires_at: string;
}

export default async function TeamSettingsPage() {
  const m = await getActiveMembership();
  if (!m.tenantId) redirect('/select-tenant');

  if (!m.isSuperAdmin && m.role !== 'tenant_admin') {
    return (
      <div className="container mx-auto px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>Only tenant admins can manage the team.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  await requireUser();
  const supabase = getServerSupabase();

  const [{ data: membersData }, { data: invitesData }] = await Promise.all([
    supabase
      .from('user_tenant_memberships')
      .select('id, role, status, user_profiles!inner(display_name, email)')
      .eq('tenant_id', m.tenantId)
      .is('deleted_at', null),
    supabase
      .from('tenant_invites')
      .select('id, email, role, expires_at')
      .eq('tenant_id', m.tenantId)
      .is('accepted_at', null)
      .is('deleted_at', null),
  ]);

  const members = (membersData ?? []) as unknown as MemberRow[];
  const invites = (invitesData ?? []) as InviteRow[];

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground">Members of this tenant and pending invites.</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Invite a teammate</CardTitle>
          <CardDescription>
            They&apos;ll receive an email with a 7-day link to set their password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteUserForm />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{member.user_profiles.display_name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.user_profiles.email ?? '—'}
                    </p>
                  </div>
                  <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs">
                    {member.role.replace('_', ' ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pending invites ({invites.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending invites.</p>
          ) : (
            <ul className="divide-y divide-border">
              {invites.map((invite) => (
                <li
                  key={invite.id}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Invited as {invite.role.replace('_', ' ')} · expires{' '}
                      {new Date(invite.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
