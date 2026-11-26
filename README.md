# NexRoad

NexRoad is a roadside-assistance simulation for Chandigarh. It models fuel delivery, mechanical assistance and towing, from a customer request through technician matching, service completion, chat and simulated payment. The production login page offers password-free previews for customer, technician and admin roles. [Open NexRoad](https://nexroad.vercel.app)

## Development setup

Use Node.js 24 and npm. Docker is required for the disposable database tests.

```sh
npm ci
cp .env.example .env.local
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local` using an existing NexRoad-compatible Supabase project. Use a publishable key or legacy anon key. Vite embeds these values in the browser bundle. Keep service-role keys, database passwords and production login credentials out of client environment variables.

```sh
npm run dev
```

The migrations extend an existing NexRoad schema. See the operations guide for the hosted migration history and fresh-project limitations. The fixture suite works without a hosted database or account.

## Roles

- **Customer** manages vehicles, reviews a server-calculated INR quote, requests assistance and follows the assigned service through chat, completion, checkout and receipt.
- **Technician** applies for approval and, once approved, manages availability, optionally shares location, responds to offers and submits service reports.
- **Admin** reviews applications, manages rates and platform settings, and monitors bookings, complaints and audit history.

## Verification and operations

- [Release and operations guide](docs/operations.md)
- [Automated test commands](tests/README.md)
- [Project progress](PROJECT_PROGRESS.md)
- [Architecture and database](docs/architecture.md)
- [Customer, technician, admin and demo guide](docs/user-guide.md)
