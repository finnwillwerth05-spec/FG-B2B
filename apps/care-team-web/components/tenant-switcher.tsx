import { selectTenant } from '@/app/select-tenant/actions';

export interface TenantOption {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: string;
}

export interface TenantSwitcherProps {
  active: { tenantId: string; tenantName: string };
  options: TenantOption[];
}

export function TenantSwitcher({ active, options }: TenantSwitcherProps) {
  if (options.length <= 1) {
    return (
      <div className="text-sm font-medium" aria-label="Active tenant">
        {active.tenantName}
      </div>
    );
  }
  return (
    <details className="relative text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 font-medium shadow-sm hover:bg-accent">
        {active.tenantName}
        <span aria-hidden className="text-xs text-muted-foreground">
          ▾
        </span>
      </summary>
      <div className="absolute left-0 top-full z-10 mt-1 w-64 rounded-md border border-input bg-popover p-1 shadow-md">
        {options.map((opt) => (
          <form action={selectTenant} key={opt.tenantId}>
            <input type="hidden" name="tenantId" value={opt.tenantId} />
            <button
              type="submit"
              disabled={opt.tenantId === active.tenantId}
              className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-accent disabled:cursor-default disabled:bg-muted/50 disabled:opacity-70"
            >
              <span className="font-medium">{opt.tenantName}</span>
              <span className="text-xs text-muted-foreground">{opt.role.replace('_', ' ')}</span>
            </button>
          </form>
        ))}
      </div>
    </details>
  );
}
