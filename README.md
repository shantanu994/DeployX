# DeployX

A cloud-based CI/CD platform that automatically builds, tests, containerizes, and deploys applications from a connected GitHub repository to the cloud — with build/deployment status visible on a live dashboard.

## Problem Statement

Setting up CI/CD manually for a small project is repetitive and error-prone — developers often end up SSH-ing into servers, manually building Docker images, and pushing updates by hand. DeployX automates this end-to-end: connect a repo, push code, and the pipeline handles build, test, containerization, and deployment automatically.

## Project Workflow

GitHub Push → GitHub Webhook → CI/CD Pipeline → Build → Test → Dockerize → Push to Container Registry → Deploy → Status/Logs shown on Dashboard

## Architecture

The repository currently contains two independently runnable services:

1. The React/Vite frontend provides the dashboard UI.
2. The Node.js backend provides the API and webhook service foundation.

Both services can be containerized independently. The frontend image uses a
multi-stage build: Node.js builds the Vite application, and the generated
`dist` directory is served as a single-page application by `serve`.

## Tech Stack

* **Frontend:** React 19, Vite 8, Tailwind CSS
* **Backend:** Node.js
* **Containerization:** Docker
* **Container Registry:** GitHub Container Registry (GHCR)
* **Cloud Deployment:** Render
* **CI/CD:** GitHub Actions

> Note: this project is not tied to a specific cloud provider — GHCR + Render were chosen for free, card-free deployment during development. The infrastructure setup is portable to other providers if needed later.

## Live Deployment

The DeployX frontend and backend are currently deployed on Render.

**Backend URL:** https://deployx-backend-latest.onrender.com

**Frontend URL:** https://deployx-frontend-latest.onrender.com

### Health Check

You can verify that the backend is running using:

https://deployx-backend-latest.onrender.com/health

## Team

| Member   | Role                          |
| -------- | ----------------------------- |
| Mitali   | Frontend + Cloud Integration  |
| Sharva   | Backend + CI/CD Pipeline      |
| Shantanu | Cloud Infrastructure + DevOps |

## Repository Structure

```text
DeployX/
├── frontend/          # React + Vite dashboard and frontend Dockerfile (Mitali)
├── backend/           # Backend APIs, webhook handling (Sharva)
├── infrastructure/    # Deployment configs, infra notes (Shantanu)
├── .github/
│   └── workflows/     # CI/CD pipeline definitions (shared)
├── docs/              # Architecture notes, setup guides (all)
├── .gitignore
├── README.md
└── LICENSE
```

## Local Setup

### Prerequisites

* Node.js 20 or later
* npm
* Docker (optional, for container builds)

### Running the Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

The Vite development server prints the local URL, normally
`http://localhost:5173`. The frontend also provides these npm scripts:

```text
npm run dev      Start the Vite development server
npm run build    Create a production build in frontend/dist
npm run lint     Run ESLint
npm run preview  Preview the production build locally
```

### Running the Backend Locally

```bash
cd backend
node server.js
```

Server runs on `http://localhost:3000` by default (or `$PORT` if set).

* `GET /` → placeholder response
* `GET /health` → returns `OK`, used for deployment health checks

### Building and Running the Frontend Container

The frontend Dockerfile builds the application in a Node.js build stage and
serves the resulting static files in a second Node.js stage:

```bash
docker build -t deployx-frontend ./frontend
docker run --rm -p 3000:3000 deployx-frontend
```

The container listens on port `3000`. Set the `PORT` environment variable when
the hosting platform provides a different port:

```bash
docker run --rm -e PORT=8080 -p 8080:8080 deployx-frontend
```

## Deployment Status

* **Backend:** deployed on Render, pulling images from GHCR
* **Frontend:** deployed on Render at https://deployx-frontend-latest.onrender.com
* **CI/CD pipeline:** manual build/push/deploy for now — GitHub Actions automation in progress

## Contribution Workflow

1. Branch from `develop` using `feature/<short-name>`
2. Commit using conventional prefixes (`feat:`, `fix:`, `docs:`, `infra:`, `docker:`, `chore:`)
3. Open a PR into `develop`; get at least 1 review
4. `develop` merges into `main` at stable milestones

## Future Features

* Full GitHub Actions pipeline (build → test → dockerize → push → deploy)
* Replace the current frontend scaffold with a dashboard showing live pipeline/deployment status and logs
* Environment variable & secrets management via GitHub Secrets
* Deployment rollback support
