import type { ReactNode } from 'react';

import { TenantSwitcher, type TenantOption } from './tenant-switcher';
import { UserMenu } from './user-menu';

export interface AppShellProps {
  active: { tenantId: string; tenantName: string };
  options: TenantOption[];
  user: { displayName: string; email: string | null };
  children: ReactNode;
}

export function AppShell({ active, options, user, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/40">
        <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-6">
            <a href="/" className="text-sm font-semibold tracking-tight text-foreground">
              Family Guardian
            </a>
            <TenantSwitcher active={active} options={options} />
          </div>
          <UserMenu displayName={user.displayName} email={user.email} />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
