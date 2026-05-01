import type { ReactNode } from 'react';

import { getActiveMembership, requireUser } from '@fg/auth/server';
import { Button } from '@fg/ui';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const m = await getActiveMembership();
  if (!m.isSuperAdmin) redirect('/select-tenant');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50">
        <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-6">
            <a href="/admin" className="text-sm font-semibold tracking-tight">
              Family Guardian — Admin
            </a>
            <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              super admin
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{user.email}</span>
            <form action="/api/auth/sign-out" method="post">
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
