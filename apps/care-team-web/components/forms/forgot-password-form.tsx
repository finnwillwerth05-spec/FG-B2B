'use client';

import { useFormState, useFormStatus } from 'react-dom';

import { Button } from '@fg/ui';

import { forgotPassword, type ForgotPasswordState } from '@/app/(auth)/forgot-password/actions';

const initialState: ForgotPasswordState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Sending…' : 'Send reset link'}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useFormState(forgotPassword, initialState);

  if (state?.sent) {
    return (
      <p className="text-sm text-muted-foreground">
        If that email is registered, a reset link has been sent. Check your inbox.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="block h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
      <p className="text-center text-sm">
        <a
          href="/login"
          className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Back to sign in
        </a>
      </p>
    </form>
  );
}
