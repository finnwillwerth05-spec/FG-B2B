import { Button } from '@fg/ui';

export default function MarketingHome() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center gap-8 p-8 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        Family Guardian — B2B
      </p>
      <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
        Daily AI check-ins that catch deterioration before it becomes a readmission.
      </h1>
      <p className="max-w-2xl text-lg text-muted-foreground">
        Built for ACOs, MA plans, physician groups, home health, and SNFs. Anchor pilot: Palm Beach
        ACO.
      </p>
      <div className="flex gap-3">
        <Button size="lg">Request a pilot</Button>
        <Button size="lg" variant="outline">
          See how it works
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Marketing site placeholder — content lands in a later session.
      </p>
    </main>
  );
}
