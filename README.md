# Family Guardian AI — B2B

AI-powered daily check-in calls for high-risk patients on behalf of risk-bearing healthcare buyers (ACOs, MA plans, physician groups, home health, SNFs).

**Start here:** read [`CLAUDE.md`](./CLAUDE.md) — product context, tech stack, conventions, commands.

## Quick start

```bash
nvm use                 # Node 20
pnpm install
pnpm db:start           # local Supabase (Docker)
pnpm db:reset           # apply migrations
pnpm db:types           # regenerate generated.ts
pnpm dev                # care-team-web on :3000, marketing-web on :3001
```

See [`docs/secrets.md`](./docs/secrets.md) for env setup.
