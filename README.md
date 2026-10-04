# DeployX

A cloud-based CI/CD platform that automatically builds, tests, containerizes, and deploys applications from a connected GitHub repository to the cloud — with build/deployment status visible on a live dashboard.

## Problem Statement

Setting up CI/CD manually for a small project is repetitive and error-prone — developers often end up SSH-ing into servers, manually building Docker images, and pushing updates by hand. DeployX automates this end-to-end: connect a repo, push code, and the pipeline handles build, test, containerization, and deployment automatically.

## Project Workflow

GitHub Push → GitHub Webhook → CI/CD Pipeline → Build → Test → Dockerize → Push to Container Registry → Deploy → Status/Logs shown on Dashboard

## Architecture

[Placeholder — add diagram once finalized]

## Tech Stack

* **Frontend:** React, Vite
* **Backend:** Node.js
* **Containerization:** Docker
* **Container Registry:** GitHub Container Registry (GHCR)
* **Cloud Deployment:** Render
* **CI/CD:** GitHub Actions

> Note: this project is not tied to a specific cloud provider — GHCR + Render were chosen for free, card-free deployment during development. The infrastructure setup is portable to other providers if needed later.

## Live Deployment

The DeployX backend is currently deployed on Render.

**Backend URL:** https://deployx-backend-latest.onrender.com

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
├── frontend/          # React + Vite dashboard (Mitali)
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

[Placeholder — add once frontend and full backend are runnable end-to-end]

### Running the Backend Locally

```bash
cd backend
node server.js
```

Server runs on `http://localhost:3000` by default (or `$PORT` if set).

* `GET /` → placeholder response
* `GET /health` → returns `OK`, used for deployment health checks

## Deployment Status

* **Backend:** deployed on Render, pulling images from GHCR
* **Frontend:** not yet deployed
* **CI/CD pipeline:** manual build/push/deploy for now — GitHub Actions automation in progress

## Contribution Workflow

1. Branch from `develop` using `feature/<short-name>`
2. Commit using conventional prefixes (`feat:`, `fix:`, `docs:`, `infra:`, `docker:`, `chore:`)
3. Open a PR into `develop`; get at least 1 review
4. `develop` merges into `main` at stable milestones

## Future Features

* Full GitHub Actions pipeline (build → test → dockerize → push → deploy)
* Frontend dashboard showing live pipeline/deployment status and logs
* Environment variable & secrets management via GitHub Secrets
* Deployment rollback support
