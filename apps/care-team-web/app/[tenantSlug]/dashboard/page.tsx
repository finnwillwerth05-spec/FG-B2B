import { getServerSupabase, requireTenant, requireUser } from '@fg/auth/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@fg/ui';

export default async function DashboardPage() {
  const m = await requireTenant();
  const user = await requireUser();
  const supabase = getServerSupabase();

  const { data: profileRow } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();
  const { data: tenantRow } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', m.tenantId)
    .maybeSingle();

  const displayName =
    (profileRow as { display_name?: string } | null)?.display_name ?? user.email ?? 'there';
  const tenantName = (tenantRow as { name?: string } | null)?.name ?? m.tenantSlug;
  const roleLabel = m.role.replace('_', ' ');

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome, {displayName}.</h1>
        <p className="mt-2 text-muted-foreground">
          You are a {roleLabel} of {tenantName}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Patients</CardTitle>
            <CardDescription>Coming in a later session.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Patient enrollment and management UI lands once auth is fully validated.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Calls</CardTitle>
            <CardDescription>Coming in Session 3.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Daily check-in calls placed via Retell, transcripts analyzed by Claude.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
            <CardDescription>Coming in Session 4.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Severity-graded alerts surfaced from analyzed call transcripts.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10">
        <a
          href={`/${m.tenantSlug}/settings/team`}
          className="text-sm text-primary underline-offset-2 hover:underline"
        >
          Manage team →
        </a>
      </div>
    </div>
  );
}
