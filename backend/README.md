# DeployX Backend

The backend engine for **DeployX**, an automated cloud CI/CD platform. Built with a lightweight, zero-bloat basic tech stack (**Node.js 20+**, **Express 5**, and native Node.js standard libraries).

---

## Features

- **GitHub Webhook Engine:** Ingests GitHub `push` and `ping` events, verifies `X-Hub-Signature-256` HMAC signatures, and automatically triggers pipeline runs.
- **Pipeline Simulation & Execution Stages:** Six simulated stages: `checkout`,
  `build`, `test`, `docker_build`, `registry_push`, and `deploy`.
- Each pipeline stage is explicitly a simulation: source retrieval, builds,
  tests, Docker images, registry pushes, and deployment actions are not
  performed. A successful status means only that the simulation completed.
- **Projects:** Seeded project catalog with isolated pipeline, deployment, and
  log histories for each project.
- **Live Logs & Real-Time Streaming:**
  - Aggregated logs or stage-filtered logs via REST.
  - Server-Sent Events (SSE) live streaming endpoint (`/api/pipelines/:id/stream`).
  - Supports manual triggers, cancellations, and retries.
- **Deployments & Rollback Engine:**
  - Manages active, superseded, and rolled-back deployments across environments (`production`, `staging`).
  - One-click rollback API that reverts to a previous stable deployment tag.
- **Environment & Secrets Management:**
  - Per-repository key-value store with automatic masking for secrets (e.g. `GITHUB_TOKEN`).
- **Dashboard Metrics:**
  - Aggregated stats endpoint (`/api/dashboard/stats`) for the frontend dashboard.
- **Production-Ready Containerization:**
  - Updated multi-stage / production `Dockerfile`.

---

## Technology Stack

- **Runtime:** Node.js 20+
- **Framework:** Express 5
- **Security & Events:** Native Node `node:crypto` (HMAC-SHA256) & `node:events` (EventEmitter / SSE)
- **Middleware:** `cors`, `dotenv`
- **Testing:** Node.js native test runner (`node:test`, `node:assert/strict`) & Supertest

---

## Project Structure

```text
backend/
├── src/
│   ├── middleware/
│   │   └── authMiddleware.js     # HS256 JWT generation & Bearer verification
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth (login, register, me, logout)
│   │   ├── dashboardRoutes.js    # /api/dashboard/stats
│   │   ├── deploymentRoutes.js   # /api/deployments & rollback
│   │   ├── pipelineRoutes.js     # /api/pipelines, logs & SSE stream
│   │   ├── projectRoutes.js      # /api/projects
│   │   ├── repositoryRoutes.js   # /api/repositories CRUD
│   │   ├── secretRoutes.js       # /api/repositories/:id/env & secrets
│   │   └── webhookRoutes.js      # /api/webhooks/github & HMAC check
│   ├── services/
│   │   ├── deploymentService.js  # Deployment logic & rollback
│   │   └── pipelineService.js    # CI/CD pipeline stage execution
│   └── store.js                  # In-memory store with seeded demo data
├── tests/
│   ├── auth.test.js
│   ├── cors.test.js
│   ├── dashboard.test.js
│   ├── deployments.test.js
│   ├── health.test.js
│   ├── pipelines.test.js
│   ├── projects.test.js
│   ├── repositories.test.js
│   ├── secrets.test.js
│   └── webhooks.test.js
├── Dockerfile
├── package.json
└── server.js
```

---

## API Reference

### Health & Base
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Backend operational check |
| `GET` | `/health` | Health check (`OK`) |

### Authentication
Default demo account: `admin@deployx.dev` / `admin123`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user account (alias `/api/auth/signup`), returns `{ token, user }` |
| `POST` | `/api/auth/login` | Sign in with `{ email, password }` (alias `/api/auth/signin`), returns `{ token, user }` |
| `GET` | `/api/auth/me` | Get authenticated user profile (requires `Authorization: Bearer <token>`) |
| `POST` | `/api/auth/logout` | Revoke the current Bearer token (requires `Authorization: Bearer <token>`) |

### GitHub Webhooks
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/webhooks/github` | Ingests GitHub webhook events (`push`, `ping`) and verifies `X-Hub-Signature-256` against `GITHUB_WEBHOOK_SECRET` |
| `POST` | `/api/webhooks/github` | Alias for `/webhooks/github` |
| `POST` | `/webhook/github` | Alias for `/webhooks/github` |

### Dashboard & Metrics
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard/stats` | Returns aggregate counts, success rates, recent runs, and active deployments |

### Projects
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/projects` | Lists registered projects with pipeline counts and latest activity |
| `GET` | `/api/projects/:id` | Gets a project with project-scoped pipelines, deployments, and recent logs |

### Repositories
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/repositories` | List connected repositories |
| `GET` | `/api/repositories/:id` | Get repository configuration |
| `POST` | `/api/repositories` | Connect a new repository |
| `PUT` | `/api/repositories/:id` | Update repository configuration |
| `DELETE` | `/api/repositories/:id` | Remove a repository |

### Pipelines & Logs
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/pipelines` | List pipeline executions (`?projectId=&repoId=&status=&limit=`) |
| `GET` | `/api/pipelines/:id` | Get details and stage statuses of a pipeline |
| `POST` | `/api/pipelines` | Manually trigger a simulated run using exactly one of `projectId` or `repoId` |
| `GET` | `/api/pipelines/:id/logs` | Fetch logs (`?stage=checkout|build|test|docker_build|registry_push|deploy`) |
| `GET` | `/api/pipelines/:id/stream` | Server-Sent Events (SSE) live updates |
| `POST` | `/api/pipelines/:id/cancel` | Cancel an active pipeline |
| `POST` | `/api/pipelines/:id/retry` | Re-trigger a pipeline |

### Deployments & Rollback
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/deployments` | List deployments (`?projectId=&repoId=&environment=&status=`) |
| `GET` | `/api/deployments/:id` | Get deployment details |
| `POST` | `/api/deployments/:id/rollback` | Rollback to target deployment and supersede active deployment |

### Secrets & Environment Variables
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/repositories/:repoId/env` | List variables (secrets are masked) |
| `POST` | `/api/repositories/:repoId/env` | Add/update variable or secret |
| `DELETE` | `/api/repositories/:repoId/env/:key` | Delete variable or secret |

---

## Environment Variables

See `.env.example` for reference:
- `PORT` — Listening port (defaults to `3000`)
- `NODE_ENV` — `development` | `production` | `test`
- `CORS_ORIGIN` — Comma-separated allowed frontend origin URL(s)
- `GITHUB_WEBHOOK_SECRET` — Secret used to verify GitHub `X-Hub-Signature-256` headers
- `JWT_SECRET` — Secret used to sign HS256 JWT tokens
- `DATA_FILE` — Optional JSON file path for MVP state persistence (defaults to in-memory)

---

## Local Development

```bash
cd backend
npm install
npm start
```

Runs at `http://localhost:3000` (or `PORT` environment variable).

### Running Tests

```bash
npm test
```

Executes Node's built-in test runner across all 10 test suites (53 tests).
