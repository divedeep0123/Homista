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

The API verifies Firebase ID tokens, maintains Homista user profiles and revocable access sessions, and versions the schema with Alembic. Signed-in users can create and list only their own home projects, and update each project's home profile. Phone OTP sign-in uses Firebase on the client and exchanges the Firebase ID token for a Homista API session.

The current project profile stores the home type, location, plot area, built-up area, floor count, and construction quality. The client includes a simple build-cost calculator: the homeowner supplies the per-square-foot rate and optional reserve. The result is transient and is not saved as an estimate record. Saved estimate history, validated materials quantities, budgets, and construction milestones remain future product work. Homista does not supply market rates in this calculator.

## Boundaries

- `mobile/` owns presentation, phone sign-in, session storage, and project screens.
- `backend/` owns HTTP endpoints, Firebase token verification, access-session validation, project ownership, and persistence.
- `qa/api/` checks backend contracts; `qa/e2e/` checks the browser rendering of the mobile app.
- `.github/workflows/ci.yml` runs API checks, migration validation, mobile TypeScript checks, and the browser smoke check on pushes and pull requests to `main`.
