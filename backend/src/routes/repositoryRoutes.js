const express = require("express");
const router = express.Router();
const store = require("../store");

/**
 * GET /api/repositories
 * List all configured repositories
 */
router.get("/", (req, res) => {
  const repos = store.listRepositories();
  res.status(200).json({
    count: repos.length,
    repositories: repos
  });
});

/**
 * GET /api/repositories/:id
 * Get single repository details
 */
router.get("/:id", (req, res) => {
  const repo = store.getRepository(req.params.id);
  if (!repo) {
    return res.status(404).json({ error: "Repository not found" });
  }
  res.status(200).json(repo);
});

/**
 * POST /api/repositories
 * Connect and configure a new repository
 */
router.post("/", (req, res) => {
  const { name, url, defaultBranch, webhookSecret, buildConfig } = req.body;

  if (!name || !url) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Both 'name' and 'url' are required"
    });
  }

  // Check if repository already exists
  const existing = store.getRepository(name);
  if (existing) {
    return res.status(409).json({
      error: "Conflict",
      message: `Repository '${name}' already exists`
    });
  }

  const newRepo = store.createRepository({
    name,
    url,
    defaultBranch,
    webhookSecret,
    buildConfig
  });

  res.status(201).json({
    message: "Repository successfully configured",
    repository: newRepo
  });
});

/**
 * PUT /api/repositories/:id
 * Update repository configuration
 */
router.put("/:id", (req, res) => {
  const updated = store.updateRepository(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: "Repository not found" });
  }
  res.status(200).json({
    message: "Repository successfully updated",
    repository: updated
  });
});

/**
 * DELETE /api/repositories/:id
 * Remove a repository
 */
router.delete("/:id", (req, res) => {
  const success = store.deleteRepository(req.params.id);
  if (!success) {
    return res.status(404).json({ error: "Repository not found" });
  }
  res.status(200).json({
    message: `Repository '${req.params.id}' successfully deleted`
  });
});

module.exports = router;
