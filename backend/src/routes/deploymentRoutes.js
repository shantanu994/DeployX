const express = require("express");
const router = express.Router();
const deploymentService = require("../services/deploymentService");

/**
 * GET /api/deployments
 * List deployments
 */
router.get("/", (req, res) => {
  const { repoId, environment, status } = req.query;
  const deployments = deploymentService.listDeployments({ repoId, environment, status });
  res.status(200).json({
    count: deployments.length,
    deployments
  });
});

/**
 * GET /api/deployments/:id
 * Get single deployment details
 */
router.get("/:id", (req, res) => {
  const deployment = deploymentService.getDeployment(req.params.id);
  if (!deployment) {
    return res.status(404).json({ error: "Deployment not found" });
  }
  res.status(200).json(deployment);
});

/**
 * POST /api/deployments/:id/rollback
 * Rollback to a previous deployment
 */
router.post("/:id/rollback", (req, res) => {
  try {
    const result = deploymentService.rollback(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    const status = err.message.includes("not found") ? 404 : 400;
    res.status(status).json({
      error: "Rollback failed",
      message: err.message
    });
  }
});

module.exports = router;
