const { test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../server");

test("GET /api/repositories/:repoId/env returns environment variables with masked secrets", async () => {
  const response = await request(app).get("/api/repositories/repo-1/env");
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body.variables));

  const secretItem = response.body.variables.find((v) => v.key === "GITHUB_TOKEN");
  assert.ok(secretItem);
  assert.equal(secretItem.isSecret, true);
  // Value should be masked with bullets
  assert.ok(secretItem.value.includes("•"));
  assert.ok(!secretItem.value.includes("secureSampleTokenForDeployment9876"));

  const publicItem = response.body.variables.find((v) => v.key === "VITE_API_URL");
  assert.ok(publicItem);
  assert.equal(publicItem.isSecret, false);
  assert.equal(publicItem.value, "https://api.deployx.dev");
});

test("POST /api/repositories/:repoId/env creates a new variable or secret", async () => {
  const response = await request(app)
    .post("/api/repositories/repo-1/env")
    .send({
      key: "DOCKER_REGISTRY_PASSWORD",
      value: "super_secret_registry_password_12345",
      isSecret: true
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.variable.key, "DOCKER_REGISTRY_PASSWORD");
  assert.equal(response.body.variable.isSecret, true);
  assert.ok(response.body.variable.value.includes("•"));
});

test("POST /api/repositories/:repoId/env rejects invalid variable names", async () => {
  const response = await request(app)
    .post("/api/repositories/repo-1/env")
    .send({
      key: "123-invalid-variable!",
      value: "test"
    });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /alphanumeric/i);
});

test("DELETE /api/repositories/:repoId/env/:key deletes variable", async () => {
  // First create variable to delete
  await request(app)
    .post("/api/repositories/repo-1/env")
    .send({
      key: "TEMP_KEY",
      value: "to_delete",
      isSecret: false
    });

  const deleteResponse = await request(app).delete("/api/repositories/repo-1/env/TEMP_KEY");
  assert.equal(deleteResponse.status, 200);

  const getResponse = await request(app).get("/api/repositories/repo-1/env");
  const found = getResponse.body.variables.find((v) => v.key === "TEMP_KEY");
  assert.equal(found, undefined);
});
