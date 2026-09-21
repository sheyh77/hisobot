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
