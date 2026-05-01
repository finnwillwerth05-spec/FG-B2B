import { getServerSupabase } from '@fg/auth/server';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@fg/ui';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  type: string;
  created_at: string;
}

export default async function AdminHome({ searchParams }: { searchParams: { created?: string } }) {
  const supabase = getServerSupabase();
  const { data } = await supabase
    .from('tenants')
    .select('id, name, slug, type, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  const tenants = (data ?? []) as TenantRow[];

  return (
    <div className="container mx-auto px-6 py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Tenants</h1>
          <p className="text-sm text-muted-foreground">
            {tenants.length} tenant{tenants.length === 1 ? '' : 's'} on this instance.
          </p>
        </div>
        <a href="/admin/tenants/new">
          <Button>Create tenant</Button>
        </a>
      </div>

      {searchParams.created ? (
        <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
          Tenant <strong>{searchParams.created}</strong> created. The first admin has been invited
          via email.
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All tenants</CardTitle>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tenants yet. Create the first one to get started.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {tenants.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.slug} · {t.type.replace('_', ' ')}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
