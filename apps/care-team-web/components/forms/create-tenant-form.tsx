'use client';

import { useFormState, useFormStatus } from 'react-dom';

import { Button } from '@fg/ui';

import { createTenant, type CreateTenantState } from '@/app/admin/tenants/new/actions';

const initialState: CreateTenantState = {};

const TENANT_TYPES = [
  { value: 'aco', label: 'ACO' },
  { value: 'ma_plan', label: 'MA Plan' },
  { value: 'physician_group', label: 'Physician Group' },
  { value: 'home_health', label: 'Home Health' },
  { value: 'snf', label: 'SNF' },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Creating…' : 'Create tenant + send invite'}
    </Button>
  );
}

export function CreateTenantForm() {
  const [state, formAction] = useFormState(createTenant, initialState);
  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Tenant name
        </label>
        <input
          id="name"
          name="name"
          required
          minLength={2}
          maxLength={100}
          placeholder="e.g. Palm Beach ACO"
          className="block h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="type" className="text-sm font-medium">
          Type
        </label>
        <select
          id="type"
          name="type"
          required
          defaultValue="aco"
          className="block h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {TENANT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="initialAdminEmail" className="text-sm font-medium">
          First tenant admin email
        </label>
        <input
          id="initialAdminEmail"
          name="initialAdminEmail"
          type="email"
          required
          placeholder="admin@example.org"
          className="block h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          They&apos;ll receive an invite link by email and can invite the rest of their team
          themselves.
        </p>
      </div>
      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <SubmitButton />
        <a href="/admin">
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </a>
      </div>
    </form>
  );
}
