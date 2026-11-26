# NexRoad checks

Use Node.js 24 and run `npm ci`. Run `npm run test:unit` for INR pricing and public Supabase configuration. Install Chromium with `npx playwright install chromium`, then run `npm run test:browser`. Set `NEXROAD_CHROMIUM_PATH` to use an installed Chromium. Set `NEXROAD_TEST_BASE_URL` to test a deployed frontend. Browser tests simulate Supabase authentication and application API responses for their fixtures.

Run `npm run test:db` with Docker available. The command starts and stops its own disposable PostgreSQL 17 container, restores a fixture of the pre-Phase 5 schema with Auth and Realtime stubs, and replays the versioned migrations. It verifies role isolation, matching, concurrent acceptance, payment and chat. The container has no published ports.

For a production build, set the public Supabase variables from `.env.example` and run `npm run build`. Use a publishable or legacy anon key for this browser application.
