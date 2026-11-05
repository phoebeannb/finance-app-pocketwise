# MERN Finance App PocketWise

## Development

The frontend is in `client/` and the authenticated API is in `server/`.

```powershell
cd server
npm install
npm run dev

cd ..\client
npm install
npm run dev
```

Set `MONGO_URI`, `JWT_SECRET`, and the other server environment variables in `server/.env`.

## API documentation

The OpenAPI 3 specification is available at [server/openapi.json](server/openapi.json) and while the server is running at `/api/openapi.json`. It documents the budget periods, investment performance entries, credit payments, and notification preferences APIs. All endpoints except `/api/health` and authentication endpoints require a bearer JWT.

## Backups

Install the MongoDB Database Tools so `mongodump` is available on `PATH`, then run:

```powershell
cd server
npm run backup
```

Backups are written to `backups/` with timestamped folders. The directory is excluded from Git; store copies in protected, encrypted storage and test restoring them regularly.

## Tests

Run the server unit tests with:

```powershell
cd server
npm test
```

For authenticated API smoke tests, set `TEST_BASE_URL` and `TEST_TOKEN` before running the same command. The client production build is validated with `cd client; npm run build`.
