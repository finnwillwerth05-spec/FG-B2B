import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@fg/ui';

import { ResetPasswordForm } from '@/components/forms/reset-password-form';

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Set new password</CardTitle>
        <CardDescription>Choose a password you&apos;ll remember.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />
      </CardContent>
    </Card>
  );
}
