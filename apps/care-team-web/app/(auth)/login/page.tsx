import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@fg/ui';

import { LoginForm } from '@/components/forms/login-form';

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Family Guardian — Care Team</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm next={searchParams.next} />
      </CardContent>
    </Card>
  );
}
