# Homista

Homista is a mobile-first home-building project workspace. This repository contains the first runnable product foundation for the MVP.

## Repository layout

- `mobile/` — Expo and React Native app using TypeScript.
- `backend/` — FastAPI service with a health endpoint.
- `qa/` — API checks with pytest and web smoke checks with Playwright.
- `docs/` — architecture and local development notes.
- `.github/workflows/` — continuous integration.

## Quick start

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API is available at `http://127.0.0.1:8000`; interactive API docs are at `/docs`.

### Mobile app

```bash
cd mobile
npm ci
npx expo run:ios
```

Phone sign-in uses native Firebase modules, so use a development build rather than Expo Go. Configure the Firebase project and native app files first; see [Firebase setup](docs/firebase-setup.md). For the browser preview, run `npm run web`.

See [Getting started](docs/getting-started.md) and [Architecture](docs/architecture.md) for details.

## Current scope

The API now verifies Firebase ID tokens, creates Homista users and revocable access sessions, and provides a current-user endpoint. The mobile app does not yet include Firebase phone OTP screens. Project workflows remain a future milestone. See [Authentication setup](docs/getting-started.md#authentication-api).
