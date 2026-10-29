const express = require("express");
const router = express.Router();
const store = require("../store");

/**
 * GET /api/dashboard/stats
 * Aggregate metrics and summary for frontend dashboard
 */
router.get("/stats", (req, res) => {
  const repos = store.listRepositories();
  const pipelines = store.listPipelines();
  const deployments = store.listDeployments();

  const totalPipelines = pipelines.length;
  const successfulPipelines = pipelines.filter((p) => p.status === "success").length;
  const failedPipelines = pipelines.filter((p) => p.status === "failed").length;
  const activeDeployments = deployments.filter((d) => d.status === "active").length;

  const completedWithDuration = pipelines.filter((p) => p.durationMs != null);
  const avgDurationMs =
    completedWithDuration.length > 0
      ? Math.round(
          completedWithDuration.reduce((acc, p) => acc + p.durationMs, 0) /
            completedWithDuration.length
        )
      : 0;

  const successRate =
    totalPipelines > 0
      ? Math.round((successfulPipelines / totalPipelines) * 100)
      : 100;

  res.status(200).json({
    metrics: {
      totalRepositories: repos.length,
      totalPipelines,
      successfulPipelines,
      failedPipelines,
      successRate: `${successRate}%`,
      activeDeployments,
      averagePipelineDurationSec: Math.round(avgDurationMs / 1000)
    },
    recentPipelines: pipelines.slice(0, 5),
    activeDeploymentsList: deployments.filter((d) => d.status === "active").slice(0, 5)
  });
});

module.exports = router;
