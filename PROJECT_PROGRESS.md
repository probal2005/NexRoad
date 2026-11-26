# NexRoad project progress

Phase 14 reviewed 26 November 2026. The Phase 5 review below records the initial audit. Work continued from the uploaded NexRoad source at GitHub commit `5dd7183`. The connected checkout is separate from the original VS Code workspace.

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
| 8 | Admin Dashboard implemented. Includes application review, app suspension/reactivation, category and rate defaults, booking and simulated payment monitoring, a consent-based technician map, complaint handling, analytics, audit history and platform settings. Hosted verification requires approved migrations. |
| 9 | Booking matching implemented with ranked offers, expiry, retry, privacy and concurrency checks. The production worker uses Supabase Cron. |
| 10 | Server-calculated INR pricing implemented for all three services. Includes editable fuel prices and service rates, quote confirmation, immutable snapshots and final simulated charges. |
| 11 | Service workflows implemented for fuel delivery, mechanical diagnosis and towing. Includes simulated travel, job reports, customer confirmation, linked towing, feedback and a per-booking timeline. |
| 12 | Private Supabase Realtime subscriptions, booking and offer updates, consent-based location, admin monitoring, reconnect recovery and polling fallback implemented. |
| 13 | Simulated cash and online checkout, failure and retry, payment history and text receipts, participant-only realtime chat, unread counts and paid earnings implemented. |
| 14 | Testing, security and optimization implemented. See the verification summary below. |
| 15 | Pending. |

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
- Phase 8 fresh PostgreSQL replay applied all five migrations and verified customer request creation, approval role changes, non-admin denial, suspension and reactivation, complaint ownership and resolution, pricing and settings changes, and the audit trail. Chromium verified the admin and suspension workflows using simulated Supabase responses.
- The first five reviewed migrations were applied to live Supabase. A rollback-only smoke test verified customer request creation, activity, cancellation, technician isolation and admin overview. Supabase assigned different ledger timestamps from the repository filenames.
- Phase 9 local PostgreSQL verified ranking, category and eligibility filters, five-offer limit, progress to the next eligible technician, timeout, cancellation, and both acceptance races. Chromium checked customer retry feedback and the technician offer workflow with simulated Supabase responses.

## Initial Phase 5 follow-up

1. Compare the original Step 5.7 SQL, if available, with the review migration and check that the private schema is excluded from Data API exposure.
2. Review the full SQL before remote application. Recheck the data preflight immediately before any approved application. Verify the installed history triggers and rerun the security advisor afterward.
3. Regenerate database types after approved migration changes. Use dedicated live test accounts to verify the customer, technician and admin flows. Rotate any demo account passwords that matched values in the original public source.
4. Review the live Auth advisor for disabled leaked-password protection as a separate project setting. [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

## Phase 9 operation

New requests dispatch immediately. The matching worker runs once a minute. It offers each booking to up to five nearest eligible technicians at a time, with a 90-second offer and a 15-minute total request window. A technician is offered each booking at most once. Distance is straight-line approach distance, and eligibility uses the configured platform radius and a location up to ten minutes old. Reconcile hosted migration ledger versions before using `supabase db push`.

## Phase 10 pricing

Administrators manage service rates and petrol and diesel prices. Initial values are simulation defaults. Fuel and mechanical assistance use a simulated 5 km approach. Towing uses straight-line pickup-to-drop-off distance. The database verifies the displayed quote at submission and saves it with the booking in one transaction. On completion, the simulated charge equals the original quote. Older bookings keep their existing data.

Local PostgreSQL checks passed for all three estimates, stale and altered quotes, direct-insert denial, idempotent retries, snapshot access, rate changes and final charges. Chromium checked price confirmation and retry, saved breakdowns and admin fuel controls using simulated Supabase responses.

## Phase 11 service simulation

A technician starts travel, starts service on arrival and submits a report. The owner confirms the report to complete the booking and record the stored simulated charge. Fuel reports use the booked quantity, and towing reports record the drop-off. Mechanical reports support roadside repair, a garage recommendation or one linked, separately priced towing booking from the original pickup. The customer map animates a synthetic approach over 45 seconds. The service timeline combines status history with report and confirmation timestamps.

Rollback-only local PostgreSQL tests verified all three service types, permission boundaries, duplicate protection and preserved charges. Chromium checked travel, service reports, confirmation, timeline and linked towing with simulated Supabase responses.

## Phase 12 realtime

Dashboards subscribe to private role-checked Broadcast channels. Database messages carry refresh hints only. Booking and location data still pass through authorized database reads. Technicians opt into sharing, the visible dashboard sends fixes no more frequently than every 15 seconds, and the database enforces a 10-second minimum between writes. Location sharing stops on request and old fixes expire after ten minutes. Customer and admin maps refresh after authorized changes.

Local PostgreSQL verified channel topics, blocking client-generated broadcasts, booking location isolation, stop sharing and write throttling. Chromium with simulated WebSocket and Supabase responses verified subscriptions, map marker movement, reconnection, status updates and channel cleanup.

## Phase 13 payment and chat simulation

Customers choose a simulated payment method during booking and can record payment after confirming service. The server uses the immutable final booking charge, preserves failed attempts and accepts only one successful payment. Receipt downloads are text files, and no payment details are requested. Technician earnings use confirmed simulated payments. Active and completed bookings support private chat between the customer and assigned technician, with timestamps, paginated messages and unread counts. Broadcasts carry refresh hints without message text.

PostgreSQL checks verified role access, sender roles, retries, unread tracking, exact amounts, payment privacy, earnings and concurrent payment attempts. Chromium verified the customer chat, unread clearing, failed-message retry, online payment retry and downloaded receipt using simulated Supabase responses.


## Phase 14 verification

- Added browser and database regression suites plus unit tests for INR pricing and browser configuration. See `tests/README.md` for the commands and fixture boundaries.
- Split dashboard and secondary routes into lazy chunks, added a page error recovery screen, and added public metadata, a sitemap and private-route indexing controls. Improved confirmation dialog focus and keyboard behavior, fixed nested navigation links, and increased login and footer contrast.
- Added browser security headers and a build-time Supabase key check. The production content security policy allows the NexRoad Supabase HTTPS and WebSocket endpoints and OpenStreetMap tiles.
- Disposable PostgreSQL 17 replay passed, including simultaneous acceptance of one booking and overlapping acceptances by one technician. The live Supabase migration is recorded as `20261126145449`. The live payment, private chat, unread state, broadcast and earnings checks passed in a rolled-back transaction.
- Supabase performance advisor no longer flags unindexed foreign keys. It still reports role-specific permissive policy and unused-index notices. The security advisor reports disabled leaked-password protection, a Supabase Pro or higher feature. Dedicated live account sign-in is still pending. [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- Local lint, TypeScript, production build, five unit checks and nine Chromium scenarios passed. The scenarios cover all three sign-in roles with fixtures, mobile layout and metadata, login accessibility, admin keyboard navigation, demo isolation, realtime reconnect, chat and payment retry. The npm dependency audit reported zero vulnerabilities.
