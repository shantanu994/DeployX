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
    "totalRepositories": 2,
    "totalPipelines": 2,
    "successfulPipelines": 1,
    "failedPipelines": 0,
    "successRate": "50%",
    "activeDeployments": 1,
    "averagePipelineDurationSec": 120
  },
  "recentPipelines": [
    {
      "id": "pipe-101",
      "repoId": "repo-1",
      "repoName": "DeployX-org/frontend",
      "branch": "main",
      "commitHash": "185da3c",
      "status": "success",
      "startedAt": "<ISO-8601 timestamp>",
      "stages": []
    }
  ],
  "activeDeploymentsList": [
    {
      "id": "dep-101",
      "repoId": "repo-1",
      "repoName": "DeployX-org/frontend",
      "environment": "production",
      "version": "v1",
      "url": "<deployment URL>"
    }
  ]
}
```

## Repositories

### `GET /api/repositories` — `api.getRepos()`

Request: no body.

Success (`200`): `{ "count": 1, "repositories": [<repository>, ...] }`.
Repository fields include `id`, `name`, `url`, `defaultBranch`, `buildConfig`,
`status`, and `createdAt`.

## Pipelines

### `GET /api/pipelines` — `api.getPipelines()`

Request: no body. Optional query parameters: `repoId`, `status`, and `limit`.

Success (`200`): `{ "count": 1, "pipelines": [<pipeline>, ...] }`.
Pipeline fields include `id`, `repoId`, `repoName`, `branch`, `commitHash`,
`commitMessage`, `author`, `status`, `trigger`, `startedAt`, `completedAt`,
`durationMs`, and `stages`. A stage has `id`, `name`, `status`, timestamps, and
`logs`.

### `POST /api/pipelines` — `api.runPipeline(repoId)`

Request:

```json
{ "repoId": "repo-1" }
```

Success (`201`): `{ "message": "Pipeline successfully initiated", "pipeline": <pipeline> }`.
The backend also accepts optional `branch`, `commitHash`, `commitMessage`,
`author`, and `sync` fields.

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

Request: no body. Optional query parameters: `repoId`, `environment`, and
`status`.

Success (`200`): `{ "count": 1, "deployments": [<deployment>, ...] }`.
Deployment fields include `id`, `pipelineId`, `repoId`, `repoName`,
`environment`, `version`, `commitHash`, `url`, `status`, and `deployedAt`.

### `POST /api/deployments/:id/rollback` — `api.rollback(id)`

Request: `{}`.

Success (`200`): `{ "message": "…", "deployment": <deployment>, "revertedFrom": "<id or null>" }`.
