'use client';

import { useFormState, useFormStatus } from 'react-dom';

import { Button } from '@fg/ui';

import { inviteUser, type InviteUserState } from '@/app/[tenantSlug]/settings/team/actions';

const initialState: InviteUserState = {};

const ROLES = [
  { value: 'care_team_member', label: 'Care team member' },
  { value: 'care_team_lead', label: 'Care team lead' },
  { value: 'tenant_admin', label: 'Tenant admin' },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Sending…' : 'Send invite'}
    </Button>
  );
}

export function InviteUserForm() {
  const [state, formAction] = useFormState(inviteUser, initialState);
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_auto]">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="teammate@example.org"
            className="block h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="role" className="text-sm font-medium">
            Role
          </label>
          <select
            id="role"
            name="role"
            required
            defaultValue="care_team_member"
            className="block h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <SubmitButton />
        </div>
      </div>
      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state?.sent ? (
        <p role="status" className="text-sm text-primary">
          Invited <strong>{state.sent.email}</strong> as {state.sent.role.replace('_', ' ')}.
        </p>
      ) : null}
    </form>
  );
}
