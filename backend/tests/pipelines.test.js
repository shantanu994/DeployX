const { test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../server");
const store = require("../src/store");

test("GET /api/pipelines returns all pipeline runs", async () => {
  const response = await request(app).get("/api/pipelines");
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.pipelines));
  assert.ok(response.body.count >= 1);
});

test("GET /api/pipelines?repoId=repo-1 filters correctly", async () => {
  const response = await request(app).get("/api/pipelines?repoId=repo-1");
  assert.equal(response.status, 200);
  for (const p of response.body.pipelines) {
    assert.equal(p.repoId, "repo-1");
  }
});

test("GET /api/pipelines/:id returns single pipeline details", async () => {
  const response = await request(app).get("/api/pipelines/pipe-101");
  assert.equal(response.status, 200);
  assert.equal(response.body.id, "pipe-101");
  assert.ok(Array.isArray(response.body.stages));
  assert.equal(response.body.stages.length, 6);
});

test("GET /api/pipelines/:id returns 404 for unknown pipeline", async () => {
  const response = await request(app).get("/api/pipelines/unknown-pipe");
  assert.equal(response.status, 404);
});

test("POST /api/pipelines initiates a manual pipeline run", async () => {
  const response = await request(app)
    .post("/api/pipelines")
    .send({
      repoId: "repo-1",
      branch: "develop",
      commitHash: "7b8a9c0",
      commitMessage: "test: add end-to-end tests",
      sync: true
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.pipeline.repoId, "repo-1");
  assert.equal(response.body.pipeline.branch, "develop");
  assert.equal(response.body.pipeline.status, "success");
});

test("POST /api/pipelines validates required repoId", async () => {
  const response = await request(app).post("/api/pipelines").send({});
  assert.equal(response.status, 400);
});

test("GET /api/pipelines/:id/logs retrieves aggregated logs", async () => {
  const response = await request(app).get("/api/pipelines/pipe-101/logs");
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.logs));
  assert.ok(response.body.logs.length > 0);
  assert.ok(response.body.stages.length > 0);
});

test("GET /api/pipelines/:id/logs?stage=build retrieves specific stage logs", async () => {
  const response = await request(app).get("/api/pipelines/pipe-101/logs?stage=build");
  assert.equal(response.status, 200);
  assert.equal(response.body.stage, "build");
  assert.ok(Array.isArray(response.body.logs));
  assert.ok(response.body.logs.some((l) => l.includes("npm run build") || l.includes("vite")));
});

test("POST /api/pipelines/:id/cancel cancels an active pipeline", async () => {
  // Create a running or queued pipeline
  const pipe = store.createPipeline({
    repoId: "repo-1",
    status: "running"
  });

  const response = await request(app).post(`/api/pipelines/${pipe.id}/cancel`);
  assert.equal(response.status, 200);
  assert.equal(response.body.pipeline.status, "cancelled");
});

test("POST /api/pipelines/:id/retry restarts an existing pipeline", async () => {
  const response = await request(app).post("/api/pipelines/pipe-101/retry");
  assert.equal(response.status, 201);
  assert.ok(response.body.pipeline.id);
  assert.equal(response.body.pipeline.repoId, "repo-1");
});
