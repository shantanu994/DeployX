const express = require("express");
const router = express.Router();
const store = require("../store");
const pipelineService = require("../services/pipelineService");

/**
 * GET /api/pipelines
 * List pipeline executions
 */
router.get("/", (req, res) => {
  const { repoId, status, limit } = req.query;
  const pipelines = store.listPipelines({ repoId, status, limit });
  res.status(200).json({
    count: pipelines.length,
    pipelines
  });
});

/**
 * GET /api/pipelines/:id
 * Retrieve details of a specific pipeline
 */
router.get("/:id", (req, res) => {
  const pipeline = store.getPipeline(req.params.id);
  if (!pipeline) {
    return res.status(404).json({ error: "Pipeline not found" });
  }
  res.status(200).json(pipeline);
});

/**
 * POST /api/pipelines
 * Manually trigger a pipeline run
 */
router.post("/", (req, res) => {
  const { repoId, branch, commitHash, commitMessage, author, sync } = req.body;

  if (!repoId) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Field 'repoId' is required"
    });
  }

  const repo = store.getRepository(repoId);
  if (!repo) {
    return res.status(404).json({
      error: "Not Found",
      message: `Repository '${repoId}' not found`
    });
  }

  try {
    const isSync = sync === true || req.headers["x-test-sync"] === "true";
    const result = pipelineService.startPipeline({
      repoId: repo.id,
      branch: branch || repo.defaultBranch || "main",
      commitHash,
      commitMessage: commitMessage || "Manual deployment trigger",
      author: author || "DeployX User",
      trigger: "manual",
      simulateAsync: !isSync
    });

    const pipeline = result.pipeline || result;

    res.status(201).json({
      message: "Pipeline successfully initiated",
      pipeline
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to trigger pipeline", message: err.message });
  }
});

/**
 * GET /api/pipelines/:id/logs
 * Retrieve logs for a pipeline or a specific stage
 */
router.get("/:id/logs", (req, res) => {
  const pipeline = store.getPipeline(req.params.id);
  if (!pipeline) {
    return res.status(404).json({ error: "Pipeline not found" });
  }

  const { stage: stageName } = req.query;

  if (stageName) {
    const stage = pipeline.stages.find(
      (s) => s.name.toLowerCase() === stageName.toLowerCase()
    );
    if (!stage) {
      return res.status(404).json({
        error: "Stage not found",
        availableStages: pipeline.stages.map((s) => s.name)
      });
    }
    return res.status(200).json({
      pipelineId: pipeline.id,
      stage: stage.name,
      status: stage.status,
      logs: stage.logs
    });
  }

  // Combine logs from all stages
  const aggregatedLogs = pipeline.stages.flatMap((s) =>
    s.logs.map((log) => `[${s.name.toUpperCase()}] ${log}`)
  );

  res.status(200).json({
    pipelineId: pipeline.id,
    status: pipeline.status,
    totalLogsCount: aggregatedLogs.length,
    logs: aggregatedLogs,
    stages: pipeline.stages.map((s) => ({
      name: s.name,
      status: s.status,
      logCount: s.logs.length
    }))
  });
});

/**
 * GET /api/pipelines/:id/stream
 * Server-Sent Events (SSE) live updates for pipeline status and logs
 */
router.get("/:id/stream", (req, res) => {
  const pipeline = store.getPipeline(req.params.id);
  if (!pipeline) {
    return res.status(404).json({ error: "Pipeline not found" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Send initial state
  res.write(`data: ${JSON.stringify({ type: "init", pipeline })}\n\n`);

  const onLog = (data) => {
    if (data.pipelineId === req.params.id) {
      res.write(`data: ${JSON.stringify({ type: "log", ...data })}\n\n`);
    }
  };

  const onStageStart = (data) => {
    if (data.pipelineId === req.params.id) {
      res.write(`data: ${JSON.stringify({ type: "stage:start", ...data })}\n\n`);
    }
  };

  const onStageComplete = (data) => {
    if (data.pipelineId === req.params.id) {
      res.write(`data: ${JSON.stringify({ type: "stage:complete", ...data })}\n\n`);
    }
  };

  const onComplete = (data) => {
    if (data.pipelineId === req.params.id) {
      res.write(`data: ${JSON.stringify({ type: "complete", ...data })}\n\n`);
      cleanup();
      res.end();
    }
  };

  pipelineService.on("pipeline:log", onLog);
  pipelineService.on("stage:start", onStageStart);
  pipelineService.on("stage:complete", onStageComplete);
  pipelineService.on("pipeline:complete", onComplete);

  const cleanup = () => {
    pipelineService.removeListener("pipeline:log", onLog);
    pipelineService.removeListener("stage:start", onStageStart);
    pipelineService.removeListener("stage:complete", onStageComplete);
    pipelineService.removeListener("pipeline:complete", onComplete);
  };

  req.on("close", cleanup);
});

/**
 * POST /api/pipelines/:id/cancel
 * Cancel an active pipeline run
 */
router.post("/:id/cancel", (req, res) => {
  try {
    const cancelled = pipelineService.cancelPipeline(req.params.id);
    if (!cancelled) {
      return res.status(404).json({ error: "Pipeline not found" });
    }
    res.status(200).json({
      message: `Pipeline '${req.params.id}' cancelled successfully`,
      pipeline: cancelled
    });
  } catch (err) {
    res.status(400).json({ error: "Bad Request", message: err.message });
  }
});

/**
 * POST /api/pipelines/:id/retry
 * Retry a failed or cancelled pipeline
 */
router.post("/:id/retry", (req, res) => {
  try {
    const retryResult = pipelineService.retryPipeline(req.params.id);
    if (!retryResult) {
      return res.status(404).json({ error: "Pipeline not found" });
    }
    const pipeline = retryResult.pipeline || retryResult;
    res.status(201).json({
      message: `Pipeline '${req.params.id}' re-triggered successfully`,
      pipeline
    });
  } catch (err) {
    res.status(400).json({ error: "Bad Request", message: err.message });
  }
});

module.exports = router;
