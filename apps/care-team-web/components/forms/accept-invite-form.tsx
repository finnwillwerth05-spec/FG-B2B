'use client';

import { useFormState, useFormStatus } from 'react-dom';

import { Button } from '@fg/ui';

import { acceptInvite, type AcceptInviteState } from '@/app/(auth)/accept-invite/[token]/actions';

const initialState: AcceptInviteState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Setting up your account…' : 'Accept invite'}
    </Button>
  );
}

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const [state, formAction] = useFormState(acceptInvite, initialState);
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          disabled
          readOnly
          className="block h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm shadow-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="displayName" className="text-sm font-medium">
          Your name
        </label>
        <input
          id="displayName"
          name="displayName"
          required
          minLength={2}
          maxLength={100}
          autoComplete="name"
          className="block h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Choose a password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="block h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
