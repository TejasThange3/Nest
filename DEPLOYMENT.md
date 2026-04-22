# Nest Deployment Guide

This project is split into:
- `mobile` (Expo React Native app, web mode deployable to Vercel)
- `server` (Express + Socket.IO backend, deploy to Render/Railway/Fly/VM)

## 1) Deploy backend first

Deploy `server` to a provider that supports long-running Node servers and WebSockets.

Recommended environment variables:
- `PORT` = provider default
- `NODE_ENV` = `production`
- `MONGODB_URI` = your Atlas URI
- `JWT_SECRET` = strong random secret
- `JWT_REFRESH_SECRET` = strong random secret
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `CORS_ORIGINS` = frontend URL(s), comma-separated
  - Example: `https://your-nest.vercel.app,http://localhost:8081`

After deploy, note backend URL, e.g.:
- `https://nest-api.onrender.com`

## 2) Configure frontend API URL

In `mobile`, create `.env` from `.env.example`:

```bash
EXPO_PUBLIC_API_BASE_URL=https://nest-api.onrender.com
```

The app reads `EXPO_PUBLIC_API_BASE_URL` in `src/utils/api.ts`.

## 3) Deploy frontend to Vercel

From `mobile`:

```bash
npx expo export --platform web
```

This generates static web output in `mobile/dist`.

In Vercel:
- Create new project
- Framework preset: `Other`
- Build command: `npx expo export --platform web`
- Output directory: `dist`
- Root directory: `mobile`
- Add env var:
  - `EXPO_PUBLIC_API_BASE_URL` = backend URL

Deploy and test auth endpoints from the live URL.

## 4) Post-deploy checks

1. Open frontend URL
2. Send OTP from phone auth screen
3. Verify OTP and register
4. Confirm user saved in Atlas `nest-video-calling.users`
5. Login works from deployed frontend

## 5) Security cleanup before sharing broadly

- Rotate any credentials that were exposed during development:
  - Twilio auth token
  - MongoDB DB user password
  - mail credentials
- Keep `.env` files out of git
- Restrict Atlas network access once deployment is stable
