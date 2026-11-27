const { test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../server");

test("GET /api/dashboard/stats returns aggregate metrics and lists", async () => {
  const response = await request(app).get("/api/dashboard/stats");
  assert.equal(response.status, 200);

  assert.ok(response.body.metrics);
  assert.ok(typeof response.body.metrics.totalRepositories === "number");
  assert.equal(response.body.metrics.totalProjects, 2);
  assert.ok(typeof response.body.metrics.totalPipelines === "number");
  assert.ok(typeof response.body.metrics.successRate === "string");
  assert.ok(typeof response.body.metrics.activeDeployments === "number");

  assert.ok(Array.isArray(response.body.recentPipelines));
  assert.ok(Array.isArray(response.body.activeDeploymentsList));
  assert.ok(Array.isArray(response.body.recentDeployments));

  assert.equal(response.body.projects.length, 2);
  assert.ok(response.body.activeDeploymentsList.some((deployment) => deployment.projectId === "project-cloudkitchen-ai"));
  assert.ok(response.body.activeDeploymentsList.some((deployment) => deployment.projectId === "project-attendance-tracker"));
});
