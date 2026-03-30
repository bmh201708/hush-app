# Hush App

## App

Install dependencies and run the Expo project:

```bash
npm install
npx expo start
```

BLE support in this project requires a development build, not Expo Go.

## Local Backend

This repo includes a Dockerized local backend for the BLE/session flow. It exposes:

- `GET /healthz`
- `GET /debug/state`
- `POST /sessions`
- `POST /telemetry/batch`
- `POST /sessions/:sessionId/status`

Start it locally with:

```bash
npm run mock-backend
```

This runs `docker compose up backend` and starts an Express service on `0.0.0.0:3000` by default.

Stop it with:

```bash
npm run mock-backend:down
```

Persistent backend data is stored under:

- `./backend-data/sqlite/`
- `./backend-data/telemetry/`
- `./backend-data/logs/`

The mobile app reads its backend URL from `EXPO_PUBLIC_HUSH_API_BASE_URL`, which is already set in your local `.env.local`.

For cloud deployment, the same `docker-compose.yml` can bind to a different host/port by setting:

```bash
HUSH_BACKEND_BIND_ADDRESS=127.0.0.1
HUSH_BACKEND_PUBLIC_PORT=38080
```
