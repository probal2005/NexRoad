# NexRoad release and operations

Production runs as a Vite SPA on Vercel with Supabase Auth, Postgres, Realtime and Cron. Vercel builds with Node.js 24 using `npm run build` and serves `dist`. The SPA rewrite must preserve direct links such as `/technician/dashboard`. [Vercel production](https://nexroad.vercel.app) · [Supabase project](https://supabase.com/dashboard/project/ayuwsgnfaqbmahyxiaip)

## Configuration

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the appropriate Vercel environment. If the Supabase hostname changes, update the HTTPS and WebSocket origins in the Content Security Policy in `vercel.json` before deploying. Review the canonical origin and sitemap if the public site hostname changes.

A dedicated local demo can use the `VITE_LOCAL_DEMO_CUSTOMER_PASSWORD`, `VITE_LOCAL_DEMO_TECHNICIAN_PASSWORD` and `VITE_LOCAL_DEMO_ADMIN_PASSWORD` values in an ignored `.env.development.local` file. Use credentials created only for that local instance. Keep the local server on loopback. The production demo uses sample data and needs no login credentials.

## Database changes

The first committed migration starts at Phase 5 and depends on the existing NexRoad tables, Auth trigger, categories and policies. The test suite reconstructs that starting point using `tests/database/baseline.sql` and a Realtime stub for disposable PostgreSQL. A new hosted project requires a reviewed schema-only baseline from a compatible NexRoad database plus the hosted Auth, Realtime and Cron configuration. The disposable test fixture does not provide a complete hosted setup.

Before applying a hosted migration, confirm the project ref, take or confirm an appropriate backup, and compare the migration filenames and names with the hosted ledger. Some historical migrations applied through the management API have hosted versions that differ from the repository filename timestamps. Reconcile entries by migration name and reviewed SQL before using a CLI push. Never replay an already installed migration merely to align its timestamp.

Run `npm run test:db` before application. Apply only reviewed missing migrations in order. Check the ledger, run Supabase advisors and verify affected privileges or calls afterward. Keep the private schema out of Data API exposure. Regenerate the committed TypeScript definitions when an exposed schema or RPC signature changes.

## Release checks

1. Install with `npm ci`. Run `npm run lint`, `npx tsc -b`, `npm run test:unit`, `npm run test:browser`, `npm run test:db` and `npm run build`.
2. Apply compatible database changes before releasing a frontend that depends on them. Record the previous working Vercel deployment and database migration version.
3. Deploy the reviewed commit to the existing NexRoad Vercel project. Verify the READY deployment owns the production alias.
4. Run `npm run smoke:production` for public HTTP checks. Run `NEXROAD_TEST_BASE_URL=https://nexroad.vercel.app npm run test:browser` for the deployed UI. These browser tests use simulated Supabase responses.
5. With dedicated live accounts, verify customer, approved technician and admin sign-in, denial of a wrong-role route, reload and sign-out. For a live workflow check, use authorized test records and verify the quote, assignment, service completion, private chat and simulated payment. Record any skipped checks separately from passes.

## Routine checks and recovery

- **Matching** runs once per minute under the Supabase Cron job `nexroad-process-matching`. If offers stop, check the latest run status, technician approval, service eligibility, online status, matching radius and location freshness.
- **Realtime** uses private channels and dashboard polling as a fallback. If live updates stop, check the connection badge, Supabase Realtime logs and the Vercel WebSocket CSP origin. Avoid sharing private channel payloads or tokens in logs.
- **Authorization** uses Supabase policies and booking-scoped RPC checks. For failures, inspect roles, account suspension and ownership before changing grants.
- **Frontend rollback** uses the preceding known-good Vercel production deployment. Re-run the HTTP and browser checks after switching the alias. Check database compatibility first. For a database incident, prefer a forward migration with a tested correction. A database restore can discard later bookings and requires an explicit recovery decision.
- **Security** review the Supabase advisor and dependency audit after releases. Leaked-password protection requires Supabase Pro or above. [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

For a database-side production smoke test, run `tests/database/production-workflow.sql` as an authorized database owner. The script creates isolated synthetic identities inside one transaction, exercises the signup trigger and role-scoped workflow, and rolls back every fixture row. It verifies database authorization under representative roles. Auth API sign-in and session issuance require separate live account testing.
