# Moliyam API

Node.js + Express + PostgreSQL backend. Firebase/Firestore remains available during migration so the existing app is not broken.

## Setup

```bash
cp .env.example .env
npm install
psql "$DATABASE_URL" -f schema.sql
npm run dev
```

Health check: `GET /health`

The API uses JWT access tokens in `Authorization: Bearer <token>`.

## Production

Set `DATABASE_URL`, a long `JWT_SECRET`, `CORS_ORIGIN`, and FCM server credentials in the hosting provider. Never commit `.env`, service-account files, private keys, or passwords.

Recommended production tuning variables:

```text
DB_POOL_MAX=20
DB_POOL_MIN=2
DB_CONNECTION_TIMEOUT_MS=5000
DB_IDLE_TIMEOUT_MS=30000
DB_QUERY_TIMEOUT_MS=10000
DB_STATEMENT_TIMEOUT_MS=10000
API_RATE_LIMIT=300
AUTH_RATE_LIMIT=20
JSON_BODY_LIMIT=2mb
```

The API enables Helmet security headers, gzip compression, bounded JSON bodies, CORS allowlisting, global/API rate limiting, auth brute-force limiting, parameter validation, paginated admin/feed queries, and PostgreSQL connection/query timeouts.

FCM production configuration requires these Render environment variables:

```text
FCM_PROJECT_ID=hisobot-app
FCM_CLIENT_EMAIL=<Firebase service-account client email>
FCM_PRIVATE_KEY=<Firebase service-account private key with literal \n escapes>
```

The notification sender uses high-priority Android delivery with the default sound, APNs priority 10 with default sound, and high-urgency Web Push. Invalid FCM registration tokens are removed automatically after a multicast send.

## Wealth API (TypeScript)

The production financial API lives in `src/wealth` and uses Express 5, TypeScript, Prisma 6, and PostgreSQL. Its Prisma tables use the `wealth_` prefix so the current JavaScript/`pg` API can continue serving the existing application during rollout. The legacy `npm run dev` and `npm start` commands remain unchanged; the new service listens on `WEALTH_PORT` (default `5001`) and serves the SRS contract under `/api`.

### Setup and Deployment

```powershell
cd server
Copy-Item .env.example .env
npm install
npm run prisma:generate
npm run prisma:validate
npm run prisma:baseline
npm run prisma:migrate
npm run db:seed
npm run dev:wealth
```

Set `DATABASE_URL` to PostgreSQL before running migrations. `prisma:baseline` is a one-time no-op marker for a pre-existing legacy database (it changes only Prisma migration metadata); omit it if that marker is already recorded. `prisma:migrate` applies committed migrations only; it does not reset the database. `db:seed` creates system categories and Free/Pro plan definitions. Demo user, accounts, transactions, debt, budget, and notification records require `NODE_ENV=development`, `SEED_DEMO_DATA=true`, and `DEMO_PASSWORD` with at least 12 characters. Hosted Render databases are explicitly blocked from demo seeding. Never enable demo seeding in production.

Build and run the production entry point with `npm run build:wealth` and `npm run start:wealth`. Configure `WEALTH_PORT`, `DATABASE_URL`, `CORS_ORIGIN`, 32-character-or-longer random `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `OTP_HMAC_SECRET`, plus Redis, SMS gateway, FCM, and S3-compatible storage variables. Production startup refuses to run without the auth, OTP, SMS, FCM and storage configuration. Do not commit `.env` or provider credentials.

The SMS adapter posts `{ "to": "<E.164 phone>", "message": "<code message>" }` to the configured HTTPS `SMS_GATEWAY_URL` with a Bearer token. The provider must implement that contract. Redis stores only an HMAC digest of the OTP, applies a 120-second expiry, 60-second resend delay, and five-attempt maximum. Receipt storage uses the S3-compatible endpoint; the `ObjectStorage` interface is the replacement point for another provider.

### Authentication and Financial Integrity

Access JWTs expire after 15 minutes and are accepted only while their session remains active. Refresh tokens are random opaque tokens; the database stores only an HMAC-SHA256 hash, and every refresh rotates the token. Logout revokes the current device session. OTP values are never written to PostgreSQL. Passwords use bcrypt cost 12. Responses select public user fields and never include password hashes or refresh-token hashes.

Financial amounts are accepted as decimal strings and stored as `Decimal(18,2)`. Account ownership is checked inside each operation. Income, expense, transfer, transaction edits/deletes, and debt payments run in PostgreSQL transactions using serializable isolation and row locks. An append-only ledger records the signed account effects; transaction edits append reversal entries and deletion soft-deletes the transaction after reversing its net ledger effect. Debt payment-linked transactions are protected from generic transaction edits. Budgets and analytics calculate from persisted transactions, not Android-provided totals. Transfers require matching currencies; dashboard balances are shown only in the user's selected currency and no FX conversion is assumed.

### API Routes

All JSON responses use `{ "success": true, "data": ... }` or the documented `error` envelope. IDs always scope through the authenticated user.

| Route | Operations |
| --- | --- |
| `/api/auth/register`, `/login`, `/refresh`, `/logout`, `/send-otp`, `/verify-otp` | Account creation, password/OTP login, session rotation and revocation |
| `/api/users/me` | `GET`, `PATCH` profile |
| `/api/accounts` and `/api/accounts/:id` | `GET`, `POST`, `PATCH`, `DELETE`; plan account limits and financial-history deletion protection |
| `/api/categories` and `/api/categories/:id` | `GET`, `POST`, `PATCH`, `DELETE`; system categories are read-only |
| `/api/transactions` and `/api/transactions/:id` | `GET`, `POST`, `PATCH`, `DELETE`; paginated search and daily groups |
| `/api/transactions/:id/receipt` | `POST` JPEG/PNG/WebP upload (5 MiB maximum), `GET` short-lived signed URL |
| `/api/debts` and `/api/debts/:id` | `GET`, `POST`, `PATCH`, `DELETE`; `POST /:id/payments` and `POST /:id/reminder` |
| `/api/budgets/current`, `/api/budgets`, `/api/budgets/:id` | Current/history, `POST`, `PATCH`, `DELETE`; live spend and category limits |
| `/api/dashboard`, `/api/analytics` | Real-data dashboard and week/month/quarter/year analytics |
| `/api/notifications`, `/api/notifications/:id/read`, `/api/notifications/read-all` | List/unread count, mark one/all read; delete by `DELETE /:id` |
| `/api/devices`, `/api/devices/:deviceId` | Register or remove an authenticated FCM device |
| `/api/subscription` | Server-derived active subscription and plan entitlements |
| `/api/reports/export` | Pro-gated PDF/XLSX generation from owner-scoped records |

Receipt and report endpoints return JSON metadata or file downloads as appropriate. Export requests are limited to 366 days and 10,000 transactions. Receipt URLs require authentication to issue; the returned object-store URL expires after five minutes.

### Database, Tests and Current Boundaries

The initial migration is `prisma/migrations/20260930180000_wealth_core/migration.sql`. Run `npm run prisma:validate`, `npm run prisma:migrate`, and `npm run db:seed` against the configured database. `npm run test:wealth` runs the current pure-logic tests for Decimal ledger signs, transfer balancing, amount validation, budget thresholds, health-score bands, and deterministic insights.

This workspace did not provide a configured PostgreSQL URL, so the migration was generated and Prisma-validated but not applied here. The current test suite does not replace PostgreSQL integration/concurrency tests; those are still required before production rollout. The generic SMS gateway must be adapted to the selected provider's contract. Billing checkout/webhook processing, multi-user debt collaboration, audit-log event writing, and Android client migration from the legacy response/auth contract remain deployment/product integration work. Recurring-transaction storage exists, but no execution worker or public route is enabled because the current client workflow does not specify it. The root `npm start` remains the legacy service; deploy `start:wealth` explicitly when the Android client is ready for this API contract.
