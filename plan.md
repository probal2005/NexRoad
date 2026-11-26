# NexRoad development plan

NexRoad is a roadside-assistance simulation for Chandigarh. Continue the existing React, Vite, TypeScript, Tailwind and Supabase application. [Shared roadmap](https://chatgpt.com/s/t_6b080aa41ba08191af6a116d8dab3270)

## Current baseline

- Phases 1–3 were previously verified.
- Phase 4 role flows passed with simulated Supabase responses. Live customer, approved technician and admin sign-in still need dedicated test accounts.
- Phase 5 has a reviewed migration and typed client. The migration passed disposable PostgreSQL tests and awaits approval for hosted application.
- Phase 6 has a deployed customer dashboard with vehicle creation, assistance requests and recent request status. The remaining scope is listed below. [Production](https://nexroad.vercel.app)

## Implementation order

| Phase | Work | Completion check |
| --- | --- | --- |
| 4. Authentication | Verify live sign-in, sign-out, persisted sessions and wrong-role denial for all three roles. | Dedicated live test accounts exercise the protected routes. |
| 5. Supabase | Compare the original history SQL if available. Review and approve the prepared migration, apply it, regenerate types and verify hosted triggers, RLS and concurrent offer acceptance. | Hosted checks confirm private history, customer insert limits and single active technician assignment. |
| 6. Customer dashboard | Add vehicle editing and deletion, then map pickup selection. Follow with responsive navigation, overview statistics, service-specific forms, quote and confirmation views, active booking details, cancellation, history, customer settings, feedback and notifications. | Customers manage their vehicles and requests on mobile and desktop. Booking, pricing and notification features use the contracts from Phases 9–13. |
| 7. Technician dashboard | Approval status, availability, rates, opt-in location, offer responses, directions, job progress and simulated earnings are implemented. Apply reviewed migrations with approval and verify with dedicated accounts. Automated offer generation comes in Phase 9. | Approved technicians can handle assigned jobs. Pending users and unrelated technicians cannot see private job data. |
| 8. Admin dashboard | Application review, account and category management, pricing defaults, booking and simulated payment monitoring, technician map, complaints, analytics, audit history and platform settings are implemented. Verify against hosted Supabase after migration approval. | Admin actions are authorized by Supabase and recorded where required. |
| 9. Booking and matching | Match active, approved technicians by service, availability and location. Rank by straight-line distance, generate expiring offers, retry through Supabase Cron, and enforce a single transactional winner. | Concurrent offers produce one winner, and a busy technician cannot accept another active booking. |
| 10. Pricing | Calculate and persist an INR estimate from service, distance and configured rates. | Customer confirmation uses the stored quote and reflects approved adjustments. |
| 11. Service workflow | Add allowed request transitions, cancellation, service completion and mechanical outcomes. | Each actor can perform only its permitted transitions. |
| 12. Realtime | Subscribe to authorized request, offer and location updates with reconnect handling. | Participants receive their own changes and recover current state after reconnecting. |
| 13. Payments and chat | Simulate payment outcomes and add booking-scoped messages. | Repeated actions are safe and participants only see their own booking conversations. |
| 14. Testing and optimization | Run role scenarios, concurrency and policy tests, accessibility checks and mobile performance review. | Record test results and resolve release-blocking failures. |
| 15. Deployment and documentation | Document setup, environment variables, migration and operations. Release approved changes and smoke-test production. | Production routes, authorization and core workflows are verified. |

## Current work

- [x] Add owner-scoped vehicle editing and confirmed removal.
- [x] Add a Chandigarh pickup map with GPS and manual coordinate alternatives.
- [x] Add section navigation, active request details and recent terminal request history.
- [x] Prepare and locally test customer cancellation for requested and matching jobs. Preserve cancelled requests in history. Review the cancellation migration after the Phase 5 migration.
- [x] Add customer profile settings and service-specific request fields.
- [x] Add an indicative listed starting rate, request review and confirmation, assigned technician name, completed-request feedback and a refreshable activity feed.
- [ ] Replace the indicative estimate with persisted distance-based quotes in Phase 10 and add live notifications in Phase 12.
- [ ] Run live customer verification after approval and application of the review migrations.

Keep development in the existing source checkout. Review hosted migrations before application. GitHub pushes and Vercel releases require authorization for the changes being released.
