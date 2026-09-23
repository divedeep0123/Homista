# Homista architecture

The MVP is a single repository with mobile, API, persistence, and QA components:

```text
Expo mobile app (iOS / Android / web)
             │ Firebase ID token over HTTPS
             ▼
FastAPI service ─── PostgreSQL
       │            users + revocable sessions
       └── Firebase Admin verifies phone-auth identity
```

The API verifies Firebase ID tokens, maintains Homista user profiles and revocable access sessions, and versions the schema with Alembic. The app currently provides a responsive project-start screen; Firebase phone OTP screens and project workflows remain to be built.

## Boundaries

- `mobile/` owns presentation and mobile navigation.
- `backend/` owns HTTP endpoints, Firebase token verification, access-session validation, and persistence.
- `qa/api/` checks backend contracts; `qa/e2e/` checks the browser rendering of the mobile app.
- `.github/workflows/ci.yml` runs API checks, migration validation, mobile TypeScript checks, and the browser smoke check on pushes and pull requests to `main`.
