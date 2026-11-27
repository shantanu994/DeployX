const { test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../server");

const projectIds = ["project-cloudkitchen-ai", "project-attendance-tracker"];

test("GET /api/projects returns the registered Vercel projects and derived counts", async () => {
  const response = await request(app).get("/api/projects");
  assert.equal(response.status, 200);
  assert.equal(response.body.count, 2);
  assert.deepEqual(
    response.body.projects.map((project) => project.id),
    projectIds
  );
  assert.equal(response.body.projects[0].name, "CloudKitchen AI");
  assert.equal(response.body.projects[1].name, "Attendance Tracker");
  for (const project of response.body.projects) {
    assert.equal(project.platform, "Vercel");
    assert.equal(project.status, "active");
    assert.equal(project.pipelineRunsCount, 0);
    assert.equal(project.lastDeployment.source, "external");
  }
});

test("GET /api/projects/:id returns isolated pipeline, deployment, and log histories", async () => {
  const response = await request(app).get(`/api/projects/${projectIds[0]}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.project.id, projectIds[0]);
  assert.equal(response.body.deployments.length, 1);
  assert.equal(response.body.deployments[0].projectId, projectIds[0]);
  assert.equal(response.body.deployments[0].status, "active");
  assert.equal(response.body.deployments[0].deployedAt, null);
  assert.deepEqual(response.body.pipelines, []);
  assert.deepEqual(response.body.recentLogs, []);
});

test("project pipeline runs, simulated deployments, and logs remain project-scoped", async () => {
  const runs = await Promise.all(
    projectIds.map((projectId) =>
      request(app)
        .post("/api/pipelines")
        .send({ projectId, sync: true })
    )
  );

  const pipelines = runs.map((response) => {
    assert.equal(response.status, 201);
    assert.equal(response.body.pipeline.executionMode, "simulation");
    assert.equal(response.body.pipeline.status, "success");
    assert.equal(response.body.pipeline.stages.length, 6);
    assert.ok(response.body.pipeline.stages.every((stage) => stage.logs.join(" ").includes("SIMULATION ONLY")));
    return response.body.pipeline;
  });

  assert.notEqual(pipelines[0].id, pipelines[1].id);
  for (let index = 0; index < projectIds.length; index += 1) {
    const projectId = projectIds[index];
    const projectName = index === 0 ? "CloudKitchen AI" : "Attendance Tracker";
    const otherProjectName = index === 0 ? "Attendance Tracker" : "CloudKitchen AI";
    const list = await request(app).get(`/api/pipelines?projectId=${projectId}`);
    assert.equal(list.status, 200);
    assert.deepEqual(list.body.pipelines.map((pipeline) => pipeline.id), [pipelines[index].id]);

    const logs = await request(app).get(`/api/pipelines/${pipelines[index].id}/logs`);
    assert.equal(logs.status, 200);
    assert.ok(logs.body.logs.length > 0);
    assert.ok(logs.body.logs.some((line) => line.includes("SIMULATION ONLY")));
    assert.ok(logs.body.logs.some((line) => line.includes(projectName)));
    assert.ok(logs.body.logs.every((line) => !line.includes(otherProjectName)));

    const deployments = await request(app).get(`/api/deployments?projectId=${projectId}`);
    assert.equal(deployments.status, 200);
    assert.equal(deployments.body.deployments.length, 2);
    assert.ok(deployments.body.deployments.every((deployment) => deployment.projectId === projectId));
    assert.equal(deployments.body.deployments[0].status, "simulated");
    assert.equal(deployments.body.deployments[0].url, null);
    assert.equal(deployments.body.deployments[1].status, "active");
  }

  const details = await request(app).get(`/api/projects/${projectIds[0]}`);
  assert.equal(details.body.pipelines.length, 1);
  assert.ok(details.body.recentLogs.length > 0);
  assert.ok(details.body.recentLogs.every((entry) => entry.pipelineId === pipelines[0].id));

  const dashboard = await request(app).get("/api/dashboard/stats");
  assert.equal(dashboard.body.metrics.totalProjects, 2);
  assert.equal(dashboard.body.metrics.totalPipelines, 3);
  assert.equal(dashboard.body.metrics.successfulPipelines, 3);
  assert.equal(dashboard.body.metrics.failedPipelines, 0);
  assert.equal(dashboard.body.metrics.activeDeployments, 2);
  assert.deepEqual(
    dashboard.body.projects.map((project) => project.pipelineRunsCount),
    [1, 1]
  );
});

test("externally managed project deployments cannot be rolled back by the simulator", async () => {
  const response = await request(app).post("/api/deployments/dep-ext-102/rollback");
  assert.equal(response.status, 400);
  assert.match(response.body.message, /externally managed/i);
});

test("project pipeline trigger validates project selection", async () => {
  const missing = await request(app).post("/api/pipelines").send({});
  assert.equal(missing.status, 400);

  const ambiguous = await request(app)
    .post("/api/pipelines")
    .send({ projectId: projectIds[0], repoId: "repo-1" });
  assert.equal(ambiguous.status, 400);

  const unknown = await request(app)
    .post("/api/pipelines")
    .send({ projectId: "unknown-project" });
  assert.equal(unknown.status, 404);
});
