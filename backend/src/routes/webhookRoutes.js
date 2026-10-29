const express = require("express");
const crypto = require("node:crypto");
const router = express.Router();
const store = require("../store");
const pipelineService = require("../services/pipelineService");

/**
 * Helper to verify GitHub HMAC-SHA256 signature
 */
function verifySignature(req, secret) {
  const signature = req.headers["x-hub-signature-256"];
  if (!signature) {
    return false;
  }

  // Use rawBody buffer captured during express.json, or stringified body
  const payload = req.rawBody ? req.rawBody : Buffer.from(JSON.stringify(req.body));
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const expectedSignature = `sha256=${hmac.digest("hex")}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(expectedSignature, "utf8")
    );
  } catch {
    return false;
  }
}

/**
 * POST /api/webhooks/github
 * Handles GitHub webhook push and ping events
 */
router.post("/github", (req, res) => {
  const event = req.headers["x-github-event"] || "push";
  const signature = req.headers["x-hub-signature-256"];
  const body = req.body || {};

  // Handle ping event
  if (event === "ping") {
    return res.status(200).json({
      message: "Webhook pong received successfully",
      zen: body.zen || "Approachable open source CI/CD.",
      hook_id: body.hook_id
    });
  }

  if (event !== "push") {
    return res.status(202).json({
      status: "ignored",
      message: `Event '${event}' acknowledged, no CI/CD action required`
    });
  }

  // Extract repository information
  const repoFullName =
    body.repository?.full_name || body.repository?.name || "DeployX-org/frontend";
  let repo = store.getRepository(repoFullName);

  // If repo doesn't exist yet, auto-register it
  if (!repo) {
    repo = store.createRepository({
      name: repoFullName,
      url: body.repository?.clone_url || `https://github.com/${repoFullName}.git`,
      defaultBranch: body.repository?.default_branch || "main"
    });
  }

  // If repository has a webhookSecret and a signature was provided, verify it
  if (repo.webhookSecret && signature) {
    const isValid = verifySignature(req, repo.webhookSecret);
    if (!isValid) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid GitHub webhook signature (X-Hub-Signature-256)"
      });
    }
  }

  // Parse push details
  const ref = body.ref || "refs/heads/main";
  const branch = ref.replace(/^refs\/heads\//, "");
  const commitHash =
    body.after ||
    body.head_commit?.id?.slice(0, 7) ||
    crypto.randomBytes(4).toString("hex");
  const commitMessage = body.head_commit?.message || "Webhook push event";
  const author = body.pusher?.name || body.sender?.login || "github-committer";

  // Trigger pipeline execution
  // In automated test environments or when 'x-test-sync' is present, run synchronously
  const simulateAsync = req.headers["x-test-sync"] !== "true";
  const result = pipelineService.startPipeline({
    repoId: repo.id,
    branch,
    commitHash,
    commitMessage,
    author,
    trigger: "webhook",
    simulateAsync
  });

  const pipeline = result.pipeline || result;

  return res.status(202).json({
    status: "triggered",
    message: `Pipeline triggered for push to ${repo.name}:${branch}`,
    pipelineId: pipeline.id,
    branch,
    commit: commitHash,
    author
  });
});

module.exports = router;
