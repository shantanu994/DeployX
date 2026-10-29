const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const request = require("supertest");
const app = require("../server");
const store = require("../src/store");

test("POST /api/webhooks/github handles ping event", async () => {
  const response = await request(app)
    .post("/api/webhooks/github")
    .set("x-github-event", "ping")
    .send({
      zen: "Responsive and clean design.",
      hook_id: 12345
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.message, "Webhook pong received successfully");
  assert.equal(response.body.zen, "Responsive and clean design.");
});

test("POST /api/webhooks/github ignores non-push non-ping events", async () => {
  const response = await request(app)
    .post("/api/webhooks/github")
    .set("x-github-event", "issues")
    .send({ action: "opened" });

  assert.equal(response.status, 202);
  assert.equal(response.body.status, "ignored");
});

test("POST /api/webhooks/github triggers pipeline on push event", async () => {
  const payload = {
    ref: "refs/heads/main",
    after: "c99077d",
    head_commit: {
      id: "c99077da1b2c3d4",
      message: "feat: automated webhook integration"
    },
    pusher: {
      name: "developer-bob"
    },
    repository: {
      name: "DeployX-org/backend",
      full_name: "DeployX-org/backend",
      clone_url: "https://github.com/DeployX-org/backend.git"
    }
  };

  const response = await request(app)
    .post("/api/webhooks/github")
    .set("x-github-event", "push")
    .set("x-test-sync", "true")
    .send(payload);

  assert.equal(response.status, 202);
  assert.equal(response.body.status, "triggered");
  assert.equal(response.body.commit, "c99077d");
  assert.ok(response.body.pipelineId);
});

test("POST /api/webhooks/github validates HMAC SHA256 signature when provided", async () => {
  const repo = store.getRepository("DeployX-org/backend");
  const secret = repo.webhookSecret;

  const payload = {
    ref: "refs/heads/feature/login",
    after: "a1b2c3d",
    head_commit: {
      id: "a1b2c3d4e5f6",
      message: "feat: add user authentication"
    },
    pusher: {
      name: "alice"
    },
    repository: {
      full_name: "DeployX-org/backend"
    }
  };

  const payloadString = JSON.stringify(payload);
  const signature =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(Buffer.from(payloadString)).digest("hex");

  const response = await request(app)
    .post("/api/webhooks/github")
    .set("x-github-event", "push")
    .set("x-hub-signature-256", signature)
    .set("Content-Type", "application/json")
    .set("x-test-sync", "true")
    .send(payloadString);

  assert.equal(response.status, 202);
  assert.equal(response.body.status, "triggered");
});

test("POST /api/webhooks/github rejects invalid HMAC signature", async () => {
  const payload = {
    ref: "refs/heads/main",
    head_commit: {
      id: "1234567",
      message: "malicious push attempt"
    },
    repository: {
      full_name: "DeployX-org/backend"
    }
  };

  const response = await request(app)
    .post("/api/webhooks/github")
    .set("x-github-event", "push")
    .set("x-hub-signature-256", "sha256=invalidhexsignatureshouldfail")
    .send(payload);

  assert.equal(response.status, 401);
  assert.equal(response.body.error, "Unauthorized");
});
