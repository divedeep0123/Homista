# Getting started

## Prerequisites

- Node.js 20 or newer and npm.
- Python 3.12.
- Xcode for iOS builds and Android Studio for Android builds.

## Run the API

From `backend/`, copy `.env.example` to `.env`, create and activate a virtual environment, install dependencies, apply the schema, then start the service:

```bash
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Check `http://127.0.0.1:8000/health` or browse the OpenAPI docs at `/docs`.

For local Firebase verification, set `FIREBASE_PROJECT_ID` and point `GOOGLE_APPLICATION_CREDENTIALS` in `.env` at a Firebase service-account JSON file. Keep that file outside the repository. Configure `JWT_SECRET` with a unique random secret of at least 32 bytes. In deployed environments, use Application Default Credentials or workload identity instead of a downloaded service-account key. Set `DATABASE_URL` to the managed PostgreSQL connection string for deployments; local development defaults to SQLite.

## Run the app

The app's phone sign-in uses native Firebase modules and needs an Expo development build; it does not run in Expo Go. Follow [Firebase setup](firebase-setup.md), then from `mobile/` run `npm ci` and either `npx expo run:ios` or `npx expo run:android`. For a browser preview, use `npm run web` after configuring the Firebase web app values.

## Run checks

From the repository root (use a Python 3.12 environment):

```bash
cd backend && pip install -r requirements-dev.txt && DATABASE_URL=sqlite:///./ci.db alembic upgrade head && python -m pytest ../qa/api
cd ../mobile && npm ci && npm run typecheck
cd ../qa && npm ci && npx playwright install chromium && npm run test:e2e
```

## Authentication API

- `POST /v1/auth/firebase` accepts `{ "id_token": "<Firebase ID token>" }` after a client completes Firebase sign-in. The API verifies the token, upserts the user, and returns a 30-minute Homista bearer token.
- `GET /v1/users/me` returns the authenticated user's profile.
- `POST /v1/auth/logout` revokes the session in the database; subsequent use of that access token returns `401`.

Send Homista tokens in `Authorization: Bearer <access_token>`. Use HTTPS for API traffic outside local development. The mobile screen does not yet implement Firebase phone OTP; the API is ready for that client integration once phone sign-in is configured in the Homista Firebase project.
