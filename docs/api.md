# Frontend API contract

The frontend reads the backend base address only from `VITE_API_URL`. Set it to
the backend origin (without an API path), for example in `frontend/.env`. Vite
embeds every `VITE_*` value in the public client bundle, so never put credentials
or other secrets in one.

The client sends JSON request bodies and, when signed in, sends
`Authorization: Bearer <token>` with API requests. Successful responses below
show the JSON body. Errors use `{ "error": "…", "message": "…" }` where the
backend provides a message; some not-found errors contain only `error`.

## Authentication

### `POST /api/auth/login` — `api.login(email, password)`

Request:

```json
{ "email": "user@example.com", "password": "password" }
```

Success (`200`):

```json
{
  "message": "Signed in successfully",
  "token": "<jwt>",
  "user": {
    "id": "user-1",
    "name": "DeployX Admin",
    "email": "admin@deployx.dev",
    "role": "admin",
    "createdAt": "<ISO-8601 timestamp>"
  }
}
```

The client stores `token` and `user` in local storage and sends the token as a
Bearer credential on subsequent requests.

### `GET /api/auth/me` — `api.getCurrentUser()`

Request: no body; requires `Authorization: Bearer <token>`.

Success (`200`): `{ "user": <user> }`, with the same safe user fields returned by
login. A `401` means the session is invalid or expired.

### `POST /api/auth/logout` — `api.logout()`

Request: `{}`; requires `Authorization: Bearer <token>`.

Success (`200`): `{ "message": "Signed out successfully" }`.

## Dashboard

### `GET /api/dashboard/stats` — `api.getStats()`

Request: no body.

Success (`200`):

```json
{
  "metrics": {
    "totalProjects": 2,
    "totalRepositories": 2,
    "totalPipelines": 1,
    "successfulPipelines": 1,
    "failedPipelines": 0,
    "successRate": "100%",
    "activeDeployments": 2,
    "averagePipelineDurationSec": 120
  },
  "projects": [
    {
      "id": "project-cloudkitchen-ai",
      "name": "CloudKitchen AI",
      "platform": "Vercel",
      "status": "active",
      "pipelineRunsCount": 0
    }
  ],
  "recentPipelines": [
    {
      "id": "pipe-101",
      "repoId": "repo-1",
      "repoName": "DeployX-org/frontend",
      "branch": "main",
      "commitHash": "185da3c",
      "status": "success",
      "executionMode": "simulation",
      "startedAt": "<ISO-8601 timestamp>",
      "stages": []
    }
  ],
  "activeDeploymentsList": [
    {
      "id": "dep-ext-102",
      "projectId": "project-cloudkitchen-ai",
      "repoId": null,
      "repoName": "CloudKitchen AI",
      "environment": "production",
      "version": "Live",
      "url": "https://ai-powered-cashflow-operating-system-for-cloud-kitch-1e8ljezix.vercel.app/"
    }
  ],
  "recentDeployments": [
    {
      "id": "dep-ext-102",
      "projectId": "project-cloudkitchen-ai",
      "repoName": "CloudKitchen AI",
      "status": "active",
      "source": "external",
      "deployedAt": null
    }
  ]
}
```

`recentDeployments` contains the latest deployment records, including simulated
pipeline outputs as well as registered external live deployments. The dashboard metrics
are calculated from the in-memory store. Project deployments
registered from the supplied Vercel URLs are marked `active` with `source:
"external"`; their original deployment timestamps are not available.

## Projects

### `GET /api/projects` — `api.getProjects()`

Returns `{ "count": 2, "projects": [...] }`. Each project has its own stable ID,
name, description, platform, live URL, status, pipeline configuration, derived
`pipelineRunsCount`, `lastPipeline`, and `lastDeployment`.

### `GET /api/projects/:id` — `api.getProject(id)`

Returns `{ "project": <project>, "pipelines": [...], "deployments": [...],
"recentLogs": [...] }`. All history and logs are filtered to that project ID.
Unknown project IDs return `404`.

## Repositories

### `GET /api/repositories` — `api.getRepos()`

Request: no body.

Success (`200`): `{ "count": 1, "repositories": [<repository>, ...] }`.
Repository fields include `id`, `name`, `url`, `defaultBranch`, `buildConfig`,
`status`, and `createdAt`.

## Pipelines

### `GET /api/pipelines` — `api.getPipelines()`

Request: no body. Optional query parameters: `projectId`, `repoId`, `status`,
and `limit`.

Success (`200`): `{ "count": 1, "pipelines": [<pipeline>, ...] }`.
Pipeline fields include `id`, `projectId`, `repoId`, `repoName`, `url`,
`platform`, `branch`, `commitHash`, `commitMessage`, `author`, `status`,
`trigger`, `executionMode`, `startedAt`, `completedAt`, `durationMs`, and
`stages`. A stage has `id`, `name`, `status`, timestamps, and
`logs`. Pipeline runs are simulations: success indicates simulated progression,
not a completed build, test, registry push, or deployment.

### `POST /api/pipelines`

Provide exactly one target ID. For a registered project:

```json
{ "projectId": "project-cloudkitchen-ai" }
```

Repository runs remain supported with `{ "repoId": "repo-1" }`. Success (`201`):
`{ "message": "Pipeline successfully initiated", "pipeline": <pipeline> }`.
The backend also accepts optional `branch`, `commitHash`, `commitMessage`,
`author`, and `sync` fields. `api.runProjectPipeline(projectId)` and
`api.runPipeline(repoId)` call this endpoint.

### `POST /api/pipelines/:id/cancel` — `api.cancelPipeline(id)`

Request: `{}`.

Success (`200`): `{ "message": "…", "pipeline": <pipeline> }`.

### `POST /api/pipelines/:id/retry` — `api.retryPipeline(id)`

Request: `{}`.

Success (`201`): `{ "message": "…", "pipeline": <pipeline> }`.

### `GET /api/pipelines/:id/logs` — `api.getLogs(id)`

Request: no body.

Success (`200`):

```json
{
  "pipelineId": "pipe-101",
  "status": "success",
  "totalLogsCount": 1,
  "logs": ["[BUILD] Build succeeded"],
  "stages": [{ "name": "build", "status": "success", "logCount": 1 }]
}
```

The frontend uses the `logs` string array. The backend also supports an optional
`stage` query parameter; that response contains `pipelineId`, `stage`, `status`,
and `logs`.

## Deployments

### `GET /api/deployments` — `api.getDeployments()`

Request: no body. Optional query parameters: `projectId`, `repoId`,
`environment`, and `status`.

Success (`200`): `{ "count": 1, "deployments": [<deployment>, ...] }`.
Deployment fields include `id`, `pipelineId`, `repoId`, `repoName`,
`environment`, `version`, `commitHash`, `url`, `status`, and `deployedAt`.

### `POST /api/deployments/:id/rollback` — `api.rollback(id)`

Request: `{}`.

Success (`200`): `{ "message": "…", "deployment": <deployment>, "revertedFrom": "<id or null>" }`.
