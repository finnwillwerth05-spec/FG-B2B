import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@fg/ui';

import { CreateTenantForm } from '@/components/forms/create-tenant-form';

export default function NewTenantPage() {
  return (
    <div className="container mx-auto px-6 py-10">
      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle>New tenant</CardTitle>
          <CardDescription>
            Creates a tenant and emails the first admin a 7-day invite link. They&apos;ll set a
            password and land on their dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateTenantForm />
        </CardContent>
      </Card>
    </div>
  );
}
