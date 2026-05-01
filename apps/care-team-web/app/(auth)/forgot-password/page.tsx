import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@fg/ui';

import { ForgotPasswordForm } from '@/components/forms/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a link to choose a new password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}
