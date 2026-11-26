<p align="center">
  <a href="https://nexroad.vercel.app/">
    <img src="public/logo/nexroad-road-pin.webp" width="104" height="104" alt="NexRoad road and location pin logo">
  </a>
</p>

<h1 align="center">NexRoad</h1>
<p align="center">A roadside assistance simulation for Chandigarh, India.</p>

<p align="center">
  <a href="https://nexroad.vercel.app/">Live site</a> ·
  <a href="https://nexroad.vercel.app/login">Sign in</a> ·
  <a href="https://github.com/probal2005/NexRoad">GitHub repository</a> ·
  <a href="https://github.com/probal2005/NexRoad/issues">Report an issue</a>
</p>

## About NexRoad

NexRoad simulates on-demand fuel delivery, mechanical assistance and towing. Customers request help at a pickup point, review an INR quote, and follow the assigned technician through service confirmation and checkout. The simulation does not dispatch real responders or collect money.

The NexRoad logo combines a location pin with a curved road to represent help at a driver's location.

| Role | What you can do |
| --- | --- |
| [Customer](https://nexroad.vercel.app/dashboard) | Save vehicles, choose a pickup point, request help, track progress, use booking chat, confirm service and download a simulated receipt. |
| [Technician](https://nexroad.vercel.app/technician/dashboard) | Apply for approval, manage availability and service rates, opt into location sharing, respond to offers and submit service reports. |
| [Administrator](https://nexroad.vercel.app/admin/dashboard) | Review applications, manage accounts and rates, monitor bookings and shared technician locations, handle complaints and review audit history. |

Dashboards require sign-in with the appropriate role. New technicians need administrator approval. A [public sample preview](https://nexroad.vercel.app/demo/customer) is available by direct link and runs in the browser.

## Technology

| Layer | Stack |
| --- | --- |
| Frontend | React, TypeScript, Vite and Tailwind CSS |
| Routing and data | React Router and TanStack Query |
| Backend | Supabase Auth, Postgres, Row Level Security, Realtime and Cron |
| Maps | Leaflet and OpenStreetMap |
| Hosting and verification | Vercel, Playwright, Node test runner and disposable PostgreSQL fixtures |

See the [architecture and database guide](docs/architecture.md) for the request lifecycle, role boundaries and database relationships.

## Run locally

Use Node.js 24 and npm. Docker is required for the disposable database tests.

```sh
git clone https://github.com/probal2005/NexRoad.git
cd NexRoad
npm ci
cp .env.example .env.local
```

Set these values in `.env.local` using a compatible Supabase project.

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key or legacy anon key |

Vite embeds these values in the browser bundle. Keep service-role keys, database passwords and live account credentials out of client environment variables.

```sh
npm run dev
```

Open the local URL printed by Vite. The committed migrations extend the existing NexRoad schema. A fresh hosted project requires the reviewed starting schema and hosted configuration described in the [operations guide](docs/operations.md). The disposable database tests use their own fixtures.

## Test and build

| Command | Checks |
| --- | --- |
| `npm run lint` | Source lint |
| `npm run test:unit` | Pricing and public configuration |
| `npm run test:browser` | Browser workflows using Supabase fixtures. Install Chromium with `npx playwright install chromium` first. |
| `npm run test:db` | Migration replay, authorization and booking concurrency in disposable PostgreSQL |
| `npm run build` | TypeScript checks and production build in `dist/` |
| `npm run smoke:production` | Live public routes, security headers, asset caching and sitemap |

## Project links

- [Services](https://nexroad.vercel.app/services), [How it works](https://nexroad.vercel.app/how-it-works) and [Contact NexRoad](https://nexroad.vercel.app/contact)
- [Customer, technician and administrator guide](docs/user-guide.md)
- [Release and operations guide](docs/operations.md)
- [Automated test guide](tests/README.md)
- [Project progress](PROJECT_PROGRESS.md)
- [Repository owner · Probal Dhali (@probal2005)](https://github.com/probal2005)
