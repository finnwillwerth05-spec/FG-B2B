# Security

> **Status:** placeholder. This doc captures the rules engineers must follow today; full HIPAA + SOC 2 work is the CTO's scope and will land before the first production buyer.

## Today's hard rules

1. **No PHI in dev or staging.** Synthetic data only. If you find yourself with a real patient name, phone number, or address — stop, delete, and ask. The seed file (`supabase/seed.sql`) ships exactly one tenant row (Palm Beach ACO, the _organization_ — not a person).
2. **No real keys in `.env`.** Real values go in `.env.local`, which is gitignored. Anyone committing real credentials triggers an immediate `git reset` and key rotation. See [`secrets.md`](./secrets.md).
3. **Service-role key never reaches the client.** `SUPABASE_SERVICE_ROLE_KEY` is server-side only. Never reference it from a Client Component, never bake it into a build artifact reachable by the browser.
4. **RLS is the security wall, not a hint.** App code does not "double-check" `tenant_id` for security; it does for correctness. RLS catches the bugs.
5. **Webhook signature verification is mandatory.** Retell, VAPI, Twilio all sign webhooks. Verify before processing. A handler that processes unsigned webhooks is a remote code execution vector for anyone with the URL.
6. **Audit log mutations.** `created_by`, `updated_by`, `deleted_by`, `acknowledged_by`, `resolved_by` columns exist for a reason; populate them on every mutation.

## Things deferred to the CTO

- Business Associate Agreements (BAAs) with Supabase, Anthropic, Retell, Twilio, Vercel
- HIPAA risk assessment + remediation plan
- SOC 2 Type 1, then Type 2
- Production environment hardening (key rotation, IP allowlists, audit log retention)
- Penetration testing
- Incident response runbook

## What "synthetic data" means

Until BAAs are in place, the data we use must be:

- **Generated**, not derived from real records (use Faker or hand-write)
- **Implausibly identifiable** (don't use real-looking SSNs, MRNs, or addresses even synthetically)
- **Marked** in seed comments / file names so it's obvious to a future auditor

Synthetic-data fixtures live alongside the code that uses them, never in the migration seed. The migration seed is for _organization-level_ records only (one tenant, no patients).

## Reporting a security concern

If you find one mid-development, stop and flag it. Don't write the fix and ship; the answer might be "rotate keys", "force-push history", or "phone the buyer". Surface it before acting.
