const { test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../server");
const store = require("../src/store");

test("GET /api/deployments returns all deployments", async () => {
  const response = await request(app).get("/api/deployments");
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.deployments));
  assert.ok(response.body.count >= 1);
});

test("GET /api/deployments/:id returns deployment details", async () => {
  const response = await request(app).get("/api/deployments/dep-101");
  assert.equal(response.status, 200);
  assert.equal(response.body.id, "dep-101");
  assert.equal(response.body.environment, "production");
  assert.equal(response.body.status, "active");
});

test("POST /api/deployments/:id/rollback executes rollback to previous deployment", async () => {
  // Setup: create an older deployment that is superseded, and a newer deployment that is currently active
  const olderDep = store.createDeployment({
    pipelineId: "pipe-older",
    repoId: "repo-2",
    repoName: "DeployX-org/backend",
    environment: "production",
    commitHash: "stable123",
    imageTag: "ghcr.io/deployx-org/backend:stable123",
    status: "superseded"
  });

  const newerDep = store.createDeployment({
    pipelineId: "pipe-newer",
    repoId: "repo-2",
    repoName: "DeployX-org/backend",
    environment: "production",
    commitHash: "buggy456",
    imageTag: "ghcr.io/deployx-org/backend:buggy456",
    status: "active"
  });

  // Rollback to olderDep
  const response = await request(app).post(`/api/deployments/${olderDep.id}/rollback`);
  assert.equal(response.status, 200);
  assert.equal(response.body.deployment.commitHash, "stable123");
  assert.equal(response.body.deployment.status, "active");
  assert.equal(response.body.revertedFrom, newerDep.id);

  // Check that newerDep is now superseded
  const updatedNewer = store.getDeployment(newerDep.id);
  assert.equal(updatedNewer.status, "superseded");
});

test("POST /api/deployments/:id/rollback rejects rollback when deployment is already active", async () => {
  const response = await request(app).post("/api/deployments/dep-101/rollback");
  assert.equal(response.status, 400);
  assert.match(response.body.message, /already the active deployment/i);
});

test("POST /api/deployments/:id/rollback returns 404 for nonexistent deployment", async () => {
  const response = await request(app).post("/api/deployments/nonexistent-dep/rollback");
  assert.equal(response.status, 404);
});
