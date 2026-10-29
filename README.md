# DeployX

DeployX is a work-in-progress cloud CI/CD platform. The repository currently
contains a React/Vite frontend scaffold and a small Express backend foundation.
The planned product will connect a GitHub repository to an automated
build-and-deployment pipeline, but webhook processing, pipeline execution, and
the deployment dashboard are not implemented yet.

## Current implementation

### Frontend

The frontend is a Vite-powered React application. It currently displays the
starter interface with:

- A React/Vite hero section using the bundled `hero.png`, React, and Vite
  assets.
- A counter button implemented with React state.
- Links to Vite and React documentation and the Vite community.
- Responsive styling with light and dark color-scheme support.
- Tailwind CSS configured through the Vite plugin, although the current
  interface is primarily styled with `src/index.css` and `src/App.css`.

The frontend is rendered from `src/main.jsx` in `StrictMode`. Its document title
is currently `frontend` in `index.html`.

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

This workflow is not wired up yet. There are currently no tracked GitHub
Actions workflow definitions, webhook routes, pipeline runner, registry
integration, or deployment automation in the repository.

## Technology

- **Frontend:** React 19, Vite 8, Tailwind CSS 4
- **Backend:** Node.js, Express 5
- **Backend middleware:** CORS and dotenv
- **Testing:** Node's built-in test runner and Supertest
- **Containerization:** Dockerfiles for the frontend and backend
- **Planned deployment:** GitHub Container Registry and Render

GHCR and Render are the intended development deployment targets, but the
repository does not currently contain provider-specific configuration or
GitHub Actions automation.

## Repository structure

```text
DeployX/
├── frontend/
│   ├── public/          # Favicon and SVG icon sprite
│   ├── src/             # React entry point, UI, styles, and image assets
│   ├── Dockerfile       # Multi-stage frontend image
│   ├── eslint.config.js
│   ├── package.json
│   └── vite.config.js   # React and Tailwind Vite plugins
├── backend/
│   ├── tests/           # HTTP tests for the current Express endpoints
│   ├── Dockerfile       # Backend container definition
│   ├── package.json
│   └── server.js        # Express application and route definitions
├── .github/
│   └── workflows/       # Reserved for future CI/CD workflows
├── docs/                # Reserved for project documentation
├── infrastructure/      # Reserved for deployment and infrastructure files
├── .gitignore
├── LICENSE
└── README.md
```

The `docs/`, `infrastructure/`, and `.github/workflows/` directories currently
contain placeholders rather than implementation files.

## Local development

### Prerequisites

- Node.js 20 or later
- npm
- Docker (optional)

### Run the frontend

```bash
cd frontend
npm install
npm run dev
```

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

The backend Dockerfile declares port `3000` and starts `server.js`:

```bash
docker build -t deployx-backend ./backend
docker run --rm -p 3000:3000 deployx-backend
```

Before using the backend image in a deployment, ensure its runtime
dependencies are installed in the image. The current Dockerfile copies
`server.js` but does not yet copy `package.json` or run `npm install`.

## Deployment status

The repository does not currently provide reproducible deployment manifests or
an automated CI/CD workflow. Any hosted frontend or backend deployment must be
configured separately from the files in this repository.

## Contribution workflow

1. Branch from `develop` using `feature/<short-name>`.
2. Use conventional commit prefixes such as `feat:`, `fix:`, `docs:`,
   `infra:`, `docker:`, and `chore:`.
3. Open a pull request into `develop` and obtain at least one review.
4. Merge `develop` into `main` at stable milestones.

## Roadmap

- Replace the frontend starter screen with a pipeline and deployment dashboard.
- Add GitHub webhook handling and repository configuration.
- Implement build, test, Dockerization, registry push, and deployment jobs.
- Add GitHub Actions automation.
- Display live pipeline status and logs.
- Add environment-variable and secrets management through GitHub Secrets.
- Add deployment rollback support.
