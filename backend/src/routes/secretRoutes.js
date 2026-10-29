const express = require("express");
const router = express.Router({ mergeParams: true });
const store = require("../store");

function maskSecret(val) {
  if (!val || typeof val !== "string") return "••••••••";
  if (val.length <= 4) return "••••";
  return val.slice(0, 4) + "•".repeat(Math.min(val.length - 4, 12));
}

/**
 * GET /api/repositories/:repoId/env
 * List environment variables and secrets (secrets masked)
 */
router.get("/:repoId/env", (req, res) => {
  const { repoId } = req.params;
  const repo = store.getRepository(repoId);
  if (!repo) {
    return res.status(404).json({ error: "Repository not found" });
  }

  const rawSecrets = store.listSecrets(repo.id);
  const sanitized = rawSecrets.map((s) => ({
    id: s.id,
    repoId: s.repoId,
    key: s.key,
    value: s.isSecret ? maskSecret(s.value) : s.value,
    isSecret: s.isSecret,
    createdAt: s.createdAt
  }));

  res.status(200).json({
    repoId: repo.id,
    count: sanitized.length,
    variables: sanitized
  });
});

/**
 * POST /api/repositories/:repoId/env
 * Set or update an environment variable or secret
 */
router.post("/:repoId/env", (req, res) => {
  const { repoId } = req.params;
  const { key, value, isSecret } = req.body;

  const repo = store.getRepository(repoId);
  if (!repo) {
    return res.status(404).json({ error: "Repository not found" });
  }

  if (!key || value === undefined) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Both 'key' and 'value' are required"
    });
  }

  // Validate environment variable key format (alphanumeric and underscore)
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Variable key must start with a letter/underscore and contain only alphanumeric characters and underscores"
    });
  }

  const saved = store.setSecret(repo.id, key, value, Boolean(isSecret));

  res.status(201).json({
    message: "Environment variable configured successfully",
    variable: {
      id: saved.id,
      repoId: saved.repoId,
      key: saved.key,
      value: saved.isSecret ? maskSecret(saved.value) : saved.value,
      isSecret: saved.isSecret,
      createdAt: saved.createdAt
    }
  });
});

/**
 * DELETE /api/repositories/:repoId/env/:key
 * Remove an environment variable or secret
 */
router.delete("/:repoId/env/:key", (req, res) => {
  const { repoId, key } = req.params;
  const repo = store.getRepository(repoId);
  if (!repo) {
    return res.status(404).json({ error: "Repository not found" });
  }

  const deleted = store.deleteSecret(repo.id, key);
  if (!deleted) {
    return res.status(404).json({ error: "Environment variable not found" });
  }

  res.status(200).json({
    message: `Environment variable '${key}' deleted successfully`
  });
});

module.exports = router;
