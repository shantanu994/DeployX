const { test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../server");
const store = require("../src/store");

test("GET /api/repositories returns list of repositories", async () => {
  const response = await request(app).get("/api/repositories");
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.repositories));
  assert.ok(response.body.count >= 2);
});

test("GET /api/repositories/:id returns repository details", async () => {
  const response = await request(app).get("/api/repositories/repo-1");
  assert.equal(response.status, 200);
  assert.equal(response.body.name, "DeployX-org/frontend");
});

test("GET /api/repositories/:id returns 404 for nonexistent repo", async () => {
  const response = await request(app).get("/api/repositories/nonexistent-id");
  assert.equal(response.status, 404);
});

test("POST /api/repositories creates a new repository", async () => {
  const newRepo = {
    name: "acme-corp/api-service",
    url: "https://github.com/acme-corp/api-service.git",
    defaultBranch: "main",
    webhookSecret: "my-custom-secret"
  };

  const response = await request(app).post("/api/repositories").send(newRepo);
  assert.equal(response.status, 201);
  assert.equal(response.body.repository.name, "acme-corp/api-service");
  assert.equal(response.body.repository.webhookSecret, "my-custom-secret");
});

test("POST /api/repositories validates required fields", async () => {
  const response = await request(app).post("/api/repositories").send({ name: "missing-url" });
  assert.equal(response.status, 400);
});

test("POST /api/repositories rejects duplicates", async () => {
  const response = await request(app).post("/api/repositories").send({
    name: "DeployX-org/frontend",
    url: "https://github.com/DeployX-org/frontend.git"
  });
  assert.equal(response.status, 409);
});

test("PUT /api/repositories/:id updates repository config", async () => {
  const response = await request(app)
    .put("/api/repositories/repo-1")
    .send({ defaultBranch: "production" });

  assert.equal(response.status, 200);
  assert.equal(response.body.repository.defaultBranch, "production");
});

test("DELETE /api/repositories/:id deletes repository", async () => {
  // First create a temporary repository
  const created = store.createRepository({
    name: "temp-delete-org/temp-repo",
    url: "https://github.com/temp-delete-org/temp-repo.git"
  });

  const response = await request(app).delete(`/api/repositories/${created.id}`);
  assert.equal(response.status, 200);

  const checkResponse = await request(app).get(`/api/repositories/${created.id}`);
  assert.equal(checkResponse.status, 404);
});
