const { test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../server");

test("GET /api/dashboard/stats returns aggregate metrics and lists", async () => {
  const response = await request(app).get("/api/dashboard/stats");
  assert.equal(response.status, 200);

  assert.ok(response.body.metrics);
  assert.ok(typeof response.body.metrics.totalRepositories === "number");
  assert.ok(typeof response.body.metrics.totalPipelines === "number");
  assert.ok(typeof response.body.metrics.successRate === "string");
  assert.ok(typeof response.body.metrics.activeDeployments === "number");

  assert.ok(Array.isArray(response.body.recentPipelines));
  assert.ok(Array.isArray(response.body.activeDeploymentsList));

  const projectUrls = [
    "https://ai-powered-cashflow-operating-system-for-cloud-kitch-1e8ljezix.vercel.app/",
    "https://personalized-attendance-tracking.vercel.app/"
  ];
  for (const url of projectUrls) {
    assert.ok(response.body.recentPipelines.some((pipeline) => pipeline.url === url));
    assert.ok(response.body.activeDeploymentsList.some((deployment) => deployment.url === url));
  }
});
