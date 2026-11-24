# DeployX

DeployX is a work-in-progress cloud CI/CD platform. The repository currently
contains a React/Vite frontend dashboard and an Express 5 backend API with an
in-memory CI/CD pipeline engine, GitHub webhook ingestion, deployment rollback,
and dashboard metrics. Real container execution, GHCR registry publishing, and
automated Render deployment triggers are planned next.

## Current implementation

### Frontend

The frontend is a React + Vite dashboard styled with Tailwind CSS (through the
`@tailwindcss/vite` plugin) and routed with React Router. It talks to the
backend REST API.

Pages:

- **Sign in** - authenticates against the backend and stores the returned
  bearer token; dashboard routes are protected and saved sessions are checked
  with the backend on startup.
- **Dashboard** - summary metrics, recent pipeline runs and active deployments.
- **Pipelines** - pick a repository and run its pipeline; view runs with
  per-stage status; cancel or retry a run; open its logs.
- **Deployments** - deployment history with environment, version, live URL and
  rollback.
- **Logs** - pick a run, filter log lines, and auto-refresh every few seconds.

Source layout: `src/App.jsx` (layout, routes, protected pages), `src/pages.jsx`
(all pages), `src/api.js` (every backend call), `src/auth.jsx` (sign-in state),
`src/auth-context.jsx` (auth context).

All backend requests use `VITE_API_URL`. Pages show loading, error, and empty
states, including a waking-server message while the free backend starts. See
[`docs/api.md`](docs/api.md) for the frontend request and response contract.
Never put credentials or other secrets in `VITE_*` variables: Vite includes
them in the public frontend bundle.

### Completed work so far

The following work has been completed in the repository:

- Added the initial React/Vite frontend structure and Tailwind CSS setup.
- Built the dashboard layout with protected navigation and sign-in state.
- Added Dashboard, Pipelines, Deployments, and Logs pages.
- Added frontend API helpers and connected the pages to the backend API
  contract.
- Integrated backend login, bearer-token requests, session restoration and
  protected routes.
- Added explicit loading, waking-server, error and empty states to the frontend.
- Documented the frontend API request and response contract in `docs/api.md`.
- Added the `VITE_API_URL` environment variable example for local frontend
  development.
- Improved dashboard styling and layout.
- Split authentication state into a dedicated auth context.
- Added the Express 5 backend with CORS, JSON parsing, raw-body capture for
  webhooks, `dotenv` support, configurable `PORT`, `/` status check, and
  `/health`.
- Implemented the core backend CI/CD APIs using an in-memory store with seeded
  demo data (`backend/src/store.js`):
  - Repository configuration CRUD (`/api/repositories`)
  - Per-repository environment variable and masked secret storage
    (`/api/repositories/:repoId/env`)
  - Event-driven 6-stage pipeline runner (`checkout`, `build`, `test`,
    `docker_build`, `registry_push`, `deploy`) with manual triggers, cancel,
    retry, stage logs, and Server-Sent Events (SSE) live streaming
    (`/api/pipelines`)
  - Deployment history and rollback state machine (`/api/deployments`)
  - GitHub webhook ingestion (`/api/webhooks/github` and `/webhook/github`)
    with `X-Hub-Signature-256` HMAC-SHA256 verification
  - Aggregated dashboard stats endpoint (`/api/dashboard/stats`)
- Added backend API documentation in `backend/README.md` and automated tests
  covering authentication, CORS, dashboard, deployments, health, pipelines,
  repositories, secrets, and webhooks.
- Added frontend and backend Dockerfiles and `.dockerignore` files for container
  deployment.
- Updated the backend Docker image to install production dependencies with
  `npm ci --omit=dev` and run with `NODE_ENV=production`.
- Added GitHub Actions CI for backend tests and frontend lint/build checks on
  pushes and pull requests targeting `develop` or `main`.

### Backend

The backend is an Express 5 application configured with CORS, JSON request-body
parsing (with raw buffer capture for webhook signature verification), and
`dotenv` environment loading. It exposes:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | Backend operational message |
| `GET` | `/health` | Plain-text `OK` health check |
| `POST` | `/api/auth/login` | Sign in and receive a bearer token |
| `GET` | `/api/auth/me` | Read the authenticated user's profile |
| `POST` | `/api/auth/logout` | Revoke the current bearer token |
| `GET` | `/api/dashboard/stats` | Aggregated metrics, recent runs, and active deployments |
| `GET`, `POST` | `/api/repositories` | List or connect repositories |
| `GET`, `PUT`, `DELETE` | `/api/repositories/:id` | Read, update, or remove a repository |
| `GET`, `POST` | `/api/repositories/:repoId/env` | List (masked) or set repository env vars/secrets |
| `DELETE` | `/api/repositories/:repoId/env/:key` | Remove a repository env var or secret |
| `GET`, `POST` | `/api/pipelines` | List pipeline runs or trigger a manual run |
| `GET` | `/api/pipelines/:id` | Pipeline details and 6-stage statuses |
| `GET` | `/api/pipelines/:id/logs` | Aggregated or stage-filtered logs (`?stage=`) |
| `GET` | `/api/pipelines/:id/stream` | Server-Sent Events (SSE) live log & status stream |
| `POST` | `/api/pipelines/:id/cancel` | Cancel a queued or running pipeline |
| `POST` | `/api/pipelines/:id/retry` | Re-trigger an existing pipeline |
| `GET` | `/api/deployments` | List deployments |
| `GET` | `/api/deployments/:id` | Single deployment details |
| `POST` | `/api/deployments/:id/rollback` | Roll back to a target deployment |
| `POST` | `/api/webhooks/github` | GitHub `ping` / `push` webhook handler (alias `/webhook/github`) |

See [`backend/README.md`](backend/README.md) for backend query parameter and
payload details, and [`docs/api.md`](docs/api.md) for the frontend API contract.
Unknown routes return a JSON `404` response. The server listens on `0.0.0.0`
and uses the `PORT` environment variable when set, or port `3000` otherwise.

## Planned workflow

The intended workflow is:

```text
GitHub push
  -> GitHub webhook
  -> build
  -> test
  -> Docker image
  -> container registry
  -> deployment
  -> dashboard status and logs
```

The webhook route, pipeline state machine, simulated 6-stage runner, live log
streaming, deployment rollback, and dashboard APIs are wired up end-to-end
using an in-memory store. Actual execution of remote `git` clones, Docker
image builds, GHCR image pushes, Render deployment hooks, and persistent
database storage are not wired up yet. GitHub Actions validates backend tests
and frontend lint/build checks on PRs and pushes, but does not yet publish
container images or deploy them automatically.

## Technology

- **Frontend:** React 19, Vite 8, Tailwind CSS 4, React Router
- **Backend:** Node.js 20+, Express 5, native `node:crypto` & `node:events`
- **Backend middleware:** CORS and dotenv
- **Testing:** Node's built-in test runner (`node:test`) and Supertest
- **Containerization:** Dockerfiles for the frontend and backend
- **CI:** GitHub Actions for backend tests and frontend lint/build
- **Planned deployment:** GitHub Container Registry and Render

GHCR and Render are the intended development deployment targets, but the
repository does not currently contain provider-specific deployment
configuration.

## Repository structure

```text
DeployX/
├── frontend/
│   ├── public/              # Favicon and SVG icon sprite
│   ├── src/
│   │   ├── api.js           # Backend REST API client
│   │   ├── auth-context.jsx # React auth context
│   │   ├── auth.jsx         # AuthProvider and session state
│   │   ├── pages.jsx        # Login, Dashboard, Pipelines, Deployments, Logs
│   │   ├── App.jsx          # Router and protected layout
│   │   └── main.jsx         # Application entry point
│   ├── .dockerignore
│   ├── .env.example
│   ├── Dockerfile           # Multi-stage frontend image
│   ├── eslint.config.js
│   ├── package.json
│   └── vite.config.js       # React and Tailwind Vite plugins
├── backend/
│   ├── src/
│   │   ├── routes/          # Express routers (dashboard, deployments, pipelines, repos, secrets, webhooks)
│   │   ├── services/        # Pipeline runner & deployment rollback services
│   │   └── store.js         # In-memory store with seeded demo data
│   ├── tests/               # 7 test suites (36 HTTP & service tests)
│   ├── .dockerignore
│   ├── .gitignore
│   ├── Dockerfile           # Production backend container definition
│   ├── package.json
│   ├── package-lock.json
│   ├── README.md            # Backend API reference
│   └── server.js            # Express application and route mounting
├── .github/
│   └── workflows/
│       └── ci.yml           # Backend tests and frontend lint/build checks
├── docs/
│   └── api.md               # Frontend API contract
├── infrastructure/          # Reserved for deployment and infrastructure files
├── .gitignore
├── LICENSE
└── README.md
```

The `docs/` and `infrastructure/` directories currently contain placeholders.
The CI workflow is implemented, but deployment and release automation are not.

## Local development

### Prerequisites

- Node.js 20 or later
- npm
- Docker (optional)

### Run the frontend

Start the backend first (see below), then:

```bash
cd frontend
npm install
cp .env.example .env    # on Windows PowerShell: copy .env.example .env
npm run dev
```

`.env` sets the backend address:

```text
VITE_API_URL=http://localhost:3000
```

If the backend runs on another port or host, change this value and restart the
dev server, because Vite reads `.env` only at startup.

Vite normally serves the application at
[`http://localhost:5173`](http://localhost:5173). The available frontend
scripts are:

```text
npm run dev      Start the Vite development server with HMR
npm run build    Create a production build in frontend/dist
npm run lint     Run ESLint
npm run preview  Preview the production build locally
```

For a production-build check, run `npm run build` followed by `npm run preview`.
The backend login endpoint has a seeded demo account: `admin@deployx.dev` /
`admin123`.

### Run and test the backend

```bash
cd backend
npm install
npm start
```

The backend runs at [`http://localhost:3000`](http://localhost:3000) by
default. To use another port:

```bash
set PORT=8080
npm start
```

On PowerShell, use `$env:PORT=8080` instead.

Run the backend tests with:

```bash
npm test
```

The test suite covers authentication, CORS, health/root endpoints, GitHub
webhooks, repository CRUD, environment variables/secrets masking, pipeline
triggers/logs/cancel/retry, deployment rollback, and dashboard stats.

## Docker

### Frontend image

The frontend Dockerfile uses a two-stage build. The first stage runs
`npm run build`; the second stage serves `dist` with the `serve` package.

```bash
docker build -t deployx-frontend ./frontend
docker run --rm -p 3000:3000 deployx-frontend
```

The container uses port `3000` by default and honors `PORT`:

```bash
docker run --rm -e PORT=8080 -p 8080:8080 deployx-frontend
```

### Backend image

The backend Dockerfile installs production dependencies (`npm ci --omit=dev`),
declares port `3000`, and starts `server.js`:

```bash
docker build -t deployx-backend ./backend
docker run --rm -p 3000:3000 deployx-backend
```

The backend build context excludes `node_modules`, environment files, tests,
logs, and Git metadata through `backend/.dockerignore`.

### Continuous integration

The workflow in `.github/workflows/ci.yml` runs for pushes and pull requests
targeting `develop` or `main`. It:

- Installs backend dependencies and runs `npm test`.
- Installs frontend dependencies, runs `npm run lint`, and runs
  `npm run build`.
- Uses Node.js 20 and supplies `VITE_API_URL` during the frontend build.

## Deployment status

The repository now has production-oriented Docker configuration and automated
CI validation. It does not yet provide reproducible deployment manifests,
container registry publishing, or automatic deployment. Any hosted frontend or
backend deployment must still be configured separately from the files in this
repository.

## Contribution workflow

1. Branch from `develop` using `feature/<short-name>`.
2. Use conventional commit prefixes such as `feat:`, `fix:`, `docs:`,
   `infra:`, `docker:`, and `chore:`.
3. Open a pull request into `develop` and obtain at least one review.
4. Merge `develop` into `main` at stable milestones.

## Roadmap

- Replace simulated pipeline stages with real build, test, Dockerization, GHCR push, and Render deployment workers.
- Add persistent database storage to replace the in-memory MVP store.
- Extend GitHub Actions automation to build/push Docker images and trigger deployments.
- Wire real-time SSE log streaming into the frontend Logs view.
