# NexRoad architecture and database

## Request lifecycle

```mermaid
flowchart LR
  Customer --> UI["React SPA on Vercel"]
  Technician --> UI
  Admin --> UI
  UI -->|"Sign-in and session refresh"| Auth["Supabase Auth"]
  Auth -->|"User identity"| API["Supabase Data API"]
  UI -->|"Typed queries and RPCs"| API
  API -->|"RLS and authorization checks"| DB[("PostgreSQL")]
  Cron["Supabase Cron"] -->|"Match and expire offers"| DB
  DB -->|"Private refresh hints"| Realtime["Supabase Realtime"]
  Realtime -->|"Refresh authorized queries"| UI
```

A customer submits a quote and request. PostgreSQL recalculates the quote, rejects stale values and persists the accepted breakdown. Matching ranks eligible technicians by approach distance. Acceptance serializes on the request and technician, with unique indexes enforcing one accepted offer per request and one active request per technician. A technician records travel, arrival and a service report. The customer confirms completion and records simulated payment. Chat is restricted to the customer and assigned technician.

## Relationships

```mermaid
erDiagram
    USER_PROFILES ||--o{ VEHICLES : owns
    USER_PROFILES ||--o{ SERVICE_REQUESTS : creates
    USER_PROFILES o|--o{ SERVICE_REQUESTS : assigned_to
    VEHICLES o|--o{ SERVICE_REQUESTS : used_for
    SERVICE_CATEGORIES ||--o{ SERVICE_REQUESTS : classifies
    SERVICE_REQUESTS ||--o{ REQUEST_OFFERS : receives
    USER_PROFILES ||--o{ REQUEST_OFFERS : offered_to
    SERVICE_REQUESTS ||--o{ REQUEST_ACTIVITY_HISTORY : records
    SERVICE_REQUESTS ||--o| BOOKING_PRICE_SNAPSHOTS : quotes
    SERVICE_REQUESTS ||--o| BOOKING_SERVICE_WORKFLOW : tracks
    SERVICE_REQUESTS ||--o| BOOKING_FINAL_CHARGES : finalizes
    SERVICE_REQUESTS ||--o{ BOOKING_PAYMENT_ATTEMPTS : records
    SERVICE_REQUESTS ||--o{ BOOKING_CHAT_MESSAGES : contains
    SERVICE_REQUESTS ||--o| CUSTOMER_REQUEST_FEEDBACK : receives
```

| Area | Data and access |
| --- | --- |
| Identity | Auth creates `user_profiles` and can initialize a pending `technician_applications` row. Admin approval controls technician access. Account suspension metadata is private. |
| Availability | Technician services, availability and latest coordinates determine matching eligibility. Assigned customer location reads require a current authorized booking and a valid shared fix. |
| Bookings | `service_requests` relates customers, categories, optional vehicles and assigned technicians. Status updates drive activity history and private Realtime refresh. |
| Quotes and payments | Quote snapshots and final charges preserve the accepted INR amount. Each payment attempt has an idempotency ID, and only one successful attempt is allowed per booking. |
| Chat | Messages store a booking and sender. The private read cursor tracks the last message seen by each participant. Admin monitoring excludes private chat bodies. |
| Administration | The private schema stores settings, service and fuel defaults, complaints, suspensions and admin audit history. Role-checked RPCs provide the client interface. |

See the versioned files in [supabase/migrations](../supabase/migrations) and client types in [database.types.ts](../src/lib/database.types.ts) for exact columns and function signatures.
