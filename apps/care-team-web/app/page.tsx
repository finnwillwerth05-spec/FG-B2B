import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@fg/ui';

export default function HomePage() {
  return (
    <main className="container mx-auto flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Family Guardian — Care Team</CardTitle>
          <CardDescription>
            Foundation scaffold. Auth, dashboards, and call workflows arrive in later sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This page imports <code className="rounded bg-muted px-1.5 py-0.5">@fg/ui</code>,
            proving the workspace package wiring works end-to-end.
          </p>
          <div className="flex gap-2">
            <Button>Primary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
