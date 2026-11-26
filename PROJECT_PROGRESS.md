# NexRoad project progress

Reviewed 26 November 2026. Scope ends at Phase 5. Work continued from the uploaded NexRoad source at GitHub commit `5dd7183`. The connected checkout is separate from the original VS Code workspace.

| Step | Status |
| --- | --- |
| Phases 1–3 | Reported complete by the project owner. |
| Phase 4 | Existing signup trigger and profile role protections reviewed. A local fixture verified that a technician signup starts as a customer with a pending application and cannot promote itself. Chromium verified sign-in, role routing, session reload, wrong-role denial and sign-out for all three roles using simulated Supabase responses. Live sign-in remains pending. |
| 5.1–5.6 | Live catalog confirms the profile, technician application, category, vehicle, technician service, availability, location, request and offer tables, plus the acceptance RPC. |
| 5.7 | The live catalog has no activity history table or activity capture triggers. The original migration file was unavailable. The review migration supplies status history for requests and offers. Compare it to the original Step 5.7 file before choosing which migration to use. |
| 5.8 | Review migration adds a customer-owned vehicle FK, assigned technician FK, one winning offer per request, one active request per technician and indexes for assignment and history lookups. The live preflight showed zero requests and offers at review time. Existing accepted offers are used for assignment backfill if rows are present at application time. Conflicts cause the transaction to fail. |
| 5.9 | Review migration fixes approval lookups across private application records, limits activity visibility to participants, tightens customer inserts and changes acceptance to lock the request and technician availability before modifying offers. An active request means accepted, technician arriving or in progress. The public RPC retains its input and response shape. |
| 5.10 | The React client uses database types derived from the review schema. Profile operations are typed and role values are validated before routes render. Live integration verification is pending. |
| 6 | Customer dashboard implemented and tested locally. The production snapshot has the initial dashboard. Local additions cover vehicle editing and removal, map pickup, active request details and history, pre-acceptance cancellation, customer settings, service-specific inputs, indicative rates and confirmation, request updates, technician names and completed-request feedback. Hosted migration approval and live verification remain pending. |
| 7 | Technician dashboard implemented locally, including approval status, availability, service rates, opt-in one-time location sharing, offer responses, job progress and directions, mechanical outcomes, ratings and simulated earnings. Offer generation belongs to Phase 9. Hosted workflow depends on approved migrations. |
| 8–15 | Pending. |

## Verification

- Live Supabase catalog and security/performance advisor reads completed. All nine live public tables had RLS enabled. The existing availability view uses security-invoker mode.
- Migration applied successfully to a disposable PostgreSQL 17 database with schema and policies reconstructed from the live catalog and a stub for Supabase Auth. Fixtures passed for customer creation, rejected forged lifecycle fields, foreign vehicle rejection, vehicle unlinking, approval lookup privacy, pending technician permissions, profile role write protection and anonymous RPC privileges.
- Activity checks passed for trigger-generated history, direct write denial, customer history without other technicians’ offers, own technician offer and assignment history, unrelated customer denial and admin visibility.
- Two-session PostgreSQL tests passed for two technicians accepting the same request and one technician accepting two requests. The unique active-assignment index also blocked a second booking after the technician was marked available again. The failed acceptance left its offer unchanged.
- Lint exited successfully with the existing React Hook Form warning in `RegisterPage.tsx`. TypeScript and the Vite production build passed. Chromium role-flow checks passed with simulated Supabase responses.
- Phase 6 Chromium checks passed at mobile width for account-scoped reads, empty states, vehicle creation, geolocation, submission error recovery, request creation and status refresh. Lint, TypeScript and the production build were rerun successfully.
- The local Phase 6 follow-up passed Chromium checks for vehicle editing, confirmed removal, cancellation, failed-removal retry, history display and map selection. Supabase responses and map tiles were simulated. Lint, TypeScript and the production build passed with the existing lint warning.
- Phase 6 cancellation migration applied to disposable PostgreSQL. Owner-only pre-acceptance cancellation, accepted-request denial, retries, activity history and closing open offers passed. Chromium with simulated Supabase responses verified confirmation, dismissal and movement from active requests to history. Lint, TypeScript and the production build passed with the existing registration warning.
- Final Phase 6 checks passed for service fields, indicative rates, confirmation, profile edits, activity updates, technician name and feedback, plus the vehicle, map and cancellation regression flows in Chromium with simulated responses. Local PostgreSQL verified owner-only technician details and feedback, completion and rating constraints, duplicate denial and anonymous RPC denial.
- Phase 7 browser checks with simulated Supabase responses passed for an applicant viewing pending status without availability controls and an approved technician toggling online and offline.
- Phase 7 rate setup passed Chromium tests with simulated Supabase responses for viewing, listing and unlisting services, failed-save retry and reload. Disposable PostgreSQL verified that approved technicians can update their own rates and that cross-account and customer writes are rejected.
- Phase 7 workflow passed Chromium checks with simulated Supabase responses for GPS consent, rate setup, offer responses, navigation, mechanical completion and earnings display. Disposable PostgreSQL verified ownership and role checks, location bounds, offer decline, transition ordering, mechanical outcomes and private performance totals.
- Remote migrations were not applied, and post-migration live tests and advisors were not run.

## Next steps

1. Compare the original Step 5.7 SQL, if available, with the review migration and check that the private schema is excluded from Data API exposure.
2. Review the full SQL before remote application. Recheck the data preflight immediately before any approved application. Verify the installed history triggers and rerun the security advisor afterward.
3. Regenerate database types after approved migration changes. Use dedicated live test accounts to verify the customer, technician and admin flows. Rotate any demo account passwords that matched values in the original public source.
4. Review the live Auth advisor for disabled leaked-password protection as a separate project setting. [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
