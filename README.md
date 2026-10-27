# Gym Wars

A browser game about building a fight gym: recruit fighters, plan their training, choose tactics, work through a career, and take on rival gyms in four-fighter Gym Wars battles.

The project contains an Express/Mongoose backend and a React/Vite frontend. The playable career uses manual week advancement. Runtime art and local fonts are included in `frontend/public`.

## Run locally

Use Node.js 22.12 or newer and npm. Install both sets of dependencies:

```sh
npm ci
npm ci --prefix frontend
```

Copy `.env.example` to `.env`. Set a private, stable `STAGING_JWT_SECRET` of at least 32 characters in `.env`; the example includes the commented setting. Do not commit this value. Keeping it stable preserves sessions between restarts.

Start the persistent local preview:

```sh
npm run staging:local
```

Open **http://127.0.0.1:5196**. The launcher builds the frontend, starts the API, and uses a local MongoDB process with persistent files in `output/local-staging/default/db`. The first start may download the MongoDB binary. Register a local account to begin.

The player-paced career preview disables the legacy scheduler and does not require Redis. Local payments are disconnected, and no production email or payment credentials are included.

Optional preview settings are documented in `.env.example`: `STAGING_INSTANCE`, `STAGING_API_PORT`, and `STAGING_WEB_PORT`.

## Development

For a separately running local MongoDB, use `npm run dev:local` for the backend and `npm run dev --prefix frontend` for the frontend. Set the local database and API URL values for that environment. The optional real-time comparison mode also needs Redis and a MongoDB replica set; it is separate from the manual-week career.

## Validation

```sh
npm test
npm run test:db
npm run build --prefix frontend
```

Browser tests use isolated disposable databases, not a player's save:

```sh
npx playwright install chromium webkit
npm run test:e2e -- --config=playwright.release.config.cjs
```

The GitHub Actions workflow runs the game validation checks on pushes and pull requests. Design and release notes are in `docs`.

## Repository contents

- `engine`, `consts`, `services`, `models`, `routes`, `controllers`: game rules and backend.
- `frontend`: browser UI, runtime art and fonts.
- `tests`, `scripts`: regression checks, simulations and local tooling.
- `docs`: design decisions and verification notes.

Local `.env` files, generated outputs, account backups, staging databases, dependencies and duplicate marketing exports are excluded from version control. Keep local saves separately; cloning this repository does not copy an existing player's account.
