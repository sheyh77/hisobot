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
