# DeployX - Cloud CI/CD Tool

DeployX is a cloud-based CI/CD platform that automatically builds, tests,
containerizes, and deploys applications from a connected GitHub repository to
IBM Cloud. A live dashboard gives developers a central view of pipeline runs,
build and deployment status, logs, and monitoring information.

## Problem Statement

Managing CI/CD manually often requires switching between GitHub, build tools,
container registries, cloud consoles, and monitoring systems. DeployX brings
these steps into one workflow so developers and small teams can trigger,
observe, and troubleshoot deployments from a single dashboard.

## Project Workflow

GitHub Push → GitHub Webhook → CI/CD Pipeline → Build → Test → Dockerize
→ Deploy to IBM Cloud → Status/Logs shown on Dashboard

## Architecture

```text
GitHub Repository
	 |
	 v
 GitHub Webhook
	 |
	 v
 DeployX Backend ----> Pipeline Execution
	 |                    |
	 |                    +--> Build and Test
	 |                    +--> Docker Image
	 |                    +--> IBM Cloud Deployment
	 |
	 +--> Status, Logs, and Monitoring API
		      ^
		      |
	   React + Vite Dashboard
```

The frontend communicates with backend APIs for pipeline management, GitHub
integration, status updates, logs, authentication, and cloud operations. The
backend coordinates builds and tests, creates Docker images, and deploys them
to the configured IBM Cloud services.

## Tech Stack

- Frontend: React, Vite
- Backend: API and pipeline services (implementation in `backend/`)
- Containerization: Docker
- Cloud: IBM Cloud (Container Registry and configured compute services)
- CI/CD: GitHub Actions

## Team And Responsibilities

| Member   | Role                            |
| -------- | ------------------------------- |
| Mitali   | Frontend and Cloud Integration  |
| Sharva   | Backend and CI/CD Pipeline      |
| Shantanu | Cloud Infrastructure and DevOps |

### Mitali - Frontend And Cloud Integration

- Build the React and Vite dashboard
- Create the pipeline management interface
- Display build and deployment status
- Build logs and monitoring views
- Connect the frontend to cloud APIs
- Configure cloud authentication for the frontend
- Document frontend setup and cloud integration

### Sharva - Backend And CI/CD Pipeline

- Build backend APIs
- Implement GitHub integration and webhooks
- Develop CI/CD pipeline logic
- Automate builds and testing
- Manage Docker image creation
- Implement pipeline execution
- Integrate backend services with cloud APIs
- Document backend and pipeline behavior

### Shantanu - Cloud Infrastructure And DevOps

- Configure IBM Cloud resources
- Set up container and compute services
- Maintain deployment infrastructure
- Configure database and storage services
- Manage environment variables and secrets
- Set up monitoring, networking, and security
- Support production deployments
- Document infrastructure and DevOps procedures

## Repository Structure

| Directory         | Purpose                                                                       |
| ----------------- | ----------------------------------------------------------------------------- |
| `frontend/`       | React + Vite dashboard and frontend cloud integration                         |
| `backend/`        | Backend APIs, GitHub integration, and pipeline execution                      |
| `infrastructure/` | IBM Cloud, deployment, networking, security, and infrastructure configuration |
| `docs/`           | Architecture, setup, integration, pipeline, and infrastructure documentation  |

## Local Setup

Prerequisites:

- Node.js and npm
- Docker
- A GitHub repository and webhook configuration
- IBM Cloud access with the required permissions

The frontend and backend are maintained as separate applications. Install each
application's dependencies from its directory and follow the setup notes in
`docs/` for environment variables, GitHub credentials, IBM Cloud credentials,
and service configuration.

```bash
cd frontend
npm install
npm run dev
```

Start the backend using the instructions in `backend/`. Do not commit secrets
or local `.env` files; use the documented environment-variable configuration.

## Contribution Workflow

1. Branch from `develop` using `feature/<short-name>`
2. Commit using conventional prefixes (`feat:`, `fix:`, `docs:`, `infra:`, `docker:`, `chore:`)
3. Open a PR into `develop`; get at least 1 review
4. `develop` merges into `main` at stable milestones

## Documentation

Project documentation is organized by ownership:

- Frontend and cloud integration: `frontend/` and `docs/`
- Backend and pipeline execution: `backend/` and `docs/`
- Infrastructure and DevOps: `infrastructure/` and `docs/`

Documentation should cover local setup, API behavior, authentication,
environment variables, deployment procedures, monitoring, and troubleshooting.

## Future Features

- More deployment targets and IBM Cloud services
- Richer pipeline history and log search
- Role-based access and team workspaces
- Notifications for failed or completed deployments
- Rollbacks and deployment approvals
