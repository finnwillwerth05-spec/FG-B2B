# ADR 0001 — Monorepo with Turborepo + pnpm workspaces

- **Date:** 2026-04-30
- **Status:** Accepted
- **Decider:** Founders (Session 1 plan)

## Context

We're starting Family Guardian B2B from scratch. Within Q3, we will likely ship:

- A buyer-facing care console (`care-team-web`)
- A marketing/investor landing site (`marketing-web`)
- API routes serving webhooks, cron, and internal endpoints
- Shared abstractions for voice (Retell, VAPI, ElevenLabs+Twilio, LiveKit), LLM analysis, auth, and DB access

These share types, design tokens, auth helpers, and a database schema. They have to evolve in lockstep — a new column on `patients` should not require coordinating PRs across separate repos.

## Decision

Single repository, pnpm workspaces, Turborepo 2 task orchestration. Apps live in `apps/*`, shared code in `packages/*`. Internal packages reference each other via `workspace:*` and consume each other's TS source directly (no per-package build step).

## Alternatives considered

### Multi-repo (one repo per app, one per package)

- **Pro:** Each repo has one CI, one ownership boundary
- **Con:** Cross-cutting changes (e.g., add `tenant_id` to a new table → update generated types → propagate to apps) require N PRs
- **Con:** Version pinning between repos becomes a job
- **Con:** Onboarding cost: a new engineer has to clone N repos to be productive

Rejected. The cross-repo coordination tax outweighs the ownership-isolation benefit at our team size.

### Single-app monolith (everything in `apps/care-team-web`)

- **Pro:** Zero monorepo tooling
- **Con:** Marketing site needs care console's auth/db boilerplate to render a static landing page — perverse coupling
- **Con:** No reuse path for `@fg/voice`, `@fg/analysis` if/when we ship background workers, mobile, or a sales-side tool

Rejected. We _will_ need separation; do it now while the cost is low.

### Nx instead of Turborepo

- **Pro:** More features (project graphs, code generators, plugin ecosystem)
- **Con:** Heavier — its own DSL, generators, conventions
- **Con:** Vercel's caching and remote-cache story for Turborepo is excellent; Nx is fine but less integrated for our stack

Rejected. Turborepo is the lighter, more idiomatic-for-Next.js choice.

### Yarn workspaces / npm workspaces instead of pnpm

- **Pro:** Slightly more familiar to some devs
- **Con:** pnpm is faster, has a strict node_modules layout that catches phantom deps, supports `workspace:*` cleanly, and is what Vercel + most modern Next.js monorepos default to

Rejected.

## Consequences

### Good

- A single `pnpm install` sets up the entire workspace
- Cross-cutting refactors land in one PR with one CI run
- Shared types between schema (generated.ts), domain (`@fg/types`), apps, and packages stay coherent
- Turborepo caches `lint`, `typecheck`, `test`, `build` per-task, per-package — incremental CI
- New devs are productive in one clone

### Painful

- A package that uses raw TS source (no build) must restrict itself to features supported by every consumer's TS / bundler. We've seen this once already (`.js` import suffixes work in TS Bundler resolution but not in Next.js webpack — fixed by dropping the suffixes)
- Versioning published packages (if we ever do) is a separate problem requiring Changesets or similar — we don't ship anything externally yet, so deferred
- Turborepo cache hits depend on stable inputs; non-deterministic tasks (e.g., codegen with timestamps) leak through

## Reversal cost

Splitting a monorepo into multi-repo later is a script with `git filter-repo`. Splitting later costs less than maintaining multi-repo coordination from day one. The decision is therefore conservative.
