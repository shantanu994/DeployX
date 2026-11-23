# DeployX

DeployX is a work-in-progress cloud CI/CD platform. The repository currently
contains a React/Vite frontend dashboard and a small Express backend
foundation. The planned product will connect a GitHub repository to an
automated build-and-deployment pipeline, but webhook processing, pipeline
execution, and live deployment data are not implemented yet.

## Current implementation

### Frontend

The frontend is a React + Vite dashboard styled with Tailwind CSS (through the
`@tailwindcss/vite` plugin) and routed with React Router. It talks to the
backend REST API.

Pages:

- **Sign in** - gate in front of the dashboard.
- **Dashboard** - summary metrics, recent pipeline runs and active deployments.
- **Pipelines** - pick a repository and run its pipeline; view runs with
  per-stage status; cancel or retry a run; open its logs.
- **Deployments** - deployment history with environment, version, live URL and
  rollback.
- **Logs** - pick a run, filter log lines, and auto-refresh every few seconds.

Source layout: `src/App.jsx` (layout, routes, protected pages), `src/pages.jsx`
(all pages), `src/api.js` (every backend call), `src/auth.jsx` (sign-in state).

The sign-in screen is currently UI-only. The backend has no login endpoint, so
any email and password are accepted.

### Completed work so far

The following work has been completed in the repository:

- Added the initial React/Vite frontend structure and Tailwind CSS setup.
- Built the dashboard layout with protected navigation and sign-in state.
- Added Dashboard, Pipelines, Deployments, and Logs pages.
- Added frontend API helpers and connected the pages to the backend API
  contract.
- Added the `VITE_API_URL` environment variable example for local frontend
  development.
- Improved dashboard styling and layout.
- Split authentication state into a dedicated auth context.
- Added the initial Express backend with CORS, JSON parsing, dotenv support,
  configurable `PORT`, and `/health`.
- Added backend tests for the root endpoint, health endpoint, and unknown
  routes.
- Added frontend and backend Dockerfiles as the starting point for container
  deployment.
- Added Docker ignore files for the frontend and backend to exclude local
  dependencies, environment files, tests, logs, and Git metadata from build
  contexts.
- Updated the backend Docker image to install production dependencies with
  `npm ci --omit=dev` and run with `NODE_ENV=production`.
- Added GitHub Actions CI for backend tests and frontend lint/build checks on
  pushes and pull requests targeting `develop` or `main`.

### Backend

The backend is an Express application configured with CORS, JSON request-body
parsing, and `dotenv` environment loading. It currently exposes:

| Method | Path | Response |
| --- | --- | --- |
| `GET` | `/` | A placeholder DeployX backend message |
| `GET` | `/health` | Plain-text `OK` |

Unknown routes return Express's standard `404` response. The server listens on
`0.0.0.0` and uses the `PORT` environment variable when set, or port `3000`
otherwise.

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

This workflow is not wired up yet. There are currently no webhook routes,
pipeline runner, registry integration, or deployment automation in the
repository. GitHub Actions now validates backend tests and frontend lint/build
checks, but it does not yet build or publish container images or deploy them.
The frontend pages currently display the planned dashboard experience and use
the available API contract; the backend does not yet provide real pipeline or
deployment data.

## Technology

- **Frontend:** React 19, Vite 8, Tailwind CSS 4
- **Backend:** Node.js, Express 5
- **Backend middleware:** CORS and dotenv
- **Testing:** Node's built-in test runner and Supertest
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
│   ├── public/          # Favicon and SVG icon sprite
│   ├── src/             # React entry point, UI, styles, and image assets
│   ├── .dockerignore
│   ├── Dockerfile       # Multi-stage frontend image
│   ├── eslint.config.js
│   ├── package.json
│   └── vite.config.js   # React and Tailwind Vite plugins
├── backend/
│   ├── tests/           # HTTP tests for the current Express endpoints
│   ├── .dockerignore
│   ├── Dockerfile       # Backend container definition
│   ├── package.json
│   └── server.js        # Express application and route definitions
├── .github/
│   └── workflows/
│       └── ci.yml       # Backend tests and frontend lint/build checks
├── docs/                # Reserved for project documentation
├── infrastructure/      # Reserved for deployment and infrastructure files
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

The tests verify the root response, the health check, and the `404` response
for an unknown route.

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

The backend Dockerfile installs production dependencies, declares port `3000`,
and starts `server.js`:

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

- Add real dashboard authentication (backend login endpoint and frontend integration).
- Add GitHub webhook handling and repository configuration.
- Implement build, test, Dockerization, registry push, and deployment jobs.
- Add GitHub Actions automation.
- Display live pipeline status and logs.
- Add environment-variable and secrets management through GitHub Secrets.
- Add deployment rollback support.
