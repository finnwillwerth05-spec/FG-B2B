import { redirect } from 'next/navigation';

import { getActiveMembership, getServerSupabase, requireUser } from '@fg/auth/server';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@fg/ui';

import { selectTenant } from './actions';

interface MembershipRow {
  tenant_id: string;
  role: string;
  tenants: { name: string; slug: string };
}

export default async function SelectTenantPage() {
  const user = await requireUser();
  const m = await getActiveMembership();

  const supabase = getServerSupabase();
  const { data } = await supabase
    .from('user_tenant_memberships')
    .select('tenant_id, role, tenants!inner(name, slug)')
    .eq('user_id', user.id)
    .is('deleted_at', null);

  const memberships = (data ?? []) as unknown as MembershipRow[];

  // Auto-redirect when the user has exactly one tenant.
  if (memberships.length === 1 && !m.isSuperAdmin) {
    const only = memberships[0]!;
    redirect(`/${only.tenants.slug}/dashboard`);
  }

  if (memberships.length === 0 && !m.isSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No tenants yet</CardTitle>
            <CardDescription>
              You&apos;re signed in but not yet a member of any tenant. Ask an admin to invite you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/auth/sign-out" method="post">
              <Button type="submit" variant="outline" className="w-full">
                Sign out
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Choose a tenant</h1>
          <p className="text-sm text-muted-foreground">
            You belong to {memberships.length} tenant{memberships.length === 1 ? '' : 's'}.
          </p>
        </div>
        <ul className="space-y-2">
          {memberships.map((row) => (
            <li key={row.tenant_id}>
              <form action={selectTenant}>
                <input type="hidden" name="tenantId" value={row.tenant_id} />
                <button
                  type="submit"
                  className="flex w-full items-center justify-between rounded-lg border border-input bg-card px-4 py-3 text-left text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <div>
                    <p className="font-medium">{row.tenants.name}</p>
                    <p className="text-xs text-muted-foreground">{row.role.replace('_', ' ')}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">→</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
        {m.isSuperAdmin ? (
          <div className="pt-2 text-center">
            <a href="/admin" className="text-sm text-primary underline-offset-2 hover:underline">
              Go to admin console
            </a>
          </div>
        ) : null}
        <div className="pt-2 text-center">
          <form action="/api/auth/sign-out" method="post">
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
