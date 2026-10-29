const { EventEmitter } = require("node:events");
const store = require("../store");

class PipelineService extends EventEmitter {
  constructor() {
    super();
    this.activeExecutions = new Map();
  }

  /**
   * Triggers a new pipeline run
   * @param {Object} options
   * @param {string} options.repoId
   * @param {string} [options.branch]
   * @param {string} [options.commitHash]
   * @param {string} [options.commitMessage]
   * @param {string} [options.author]
   * @param {string} [options.trigger] - 'manual' | 'webhook' | 'rollback'
   * @param {boolean} [options.simulateAsync=true] - run in background or complete immediately
   */
  startPipeline(options) {
    const repo = store.getRepository(options.repoId);
    if (!repo) {
      throw new Error(`Repository with ID or name '${options.repoId}' not found`);
    }

    const pipeline = store.createPipeline({
      repoId: repo.id,
      repoName: repo.name,
      branch: options.branch || repo.defaultBranch || "main",
      commitHash: options.commitHash || Math.random().toString(16).substring(2, 9),
      commitMessage: options.commitMessage || "Manual deployment trigger",
      author: options.author || "DeployX Engineer",
      trigger: options.trigger || "manual",
      status: "queued"
    });

    this.emit("pipeline:queued", pipeline);

    if (options.simulateAsync === false) {
      // Synchronous execution (useful for deterministic unit testing)
      return this._executeSynchronously(pipeline, repo);
    }

    // Default: Asynchronous progression with timer ticks
    this._runPipelineAsync(pipeline.id, repo);
    return pipeline;
  }

  /**
   * Run stages asynchronously with small delays for live streaming
   */
  async _runPipelineAsync(pipelineId, repo) {
    const pipeline = store.getPipeline(pipelineId);
    if (!pipeline) return;

    pipeline.status = "running";
    store.updatePipeline(pipelineId, { status: "running" });
    this.emit("pipeline:status", { pipelineId, status: "running" });

    const stagesConfig = [
      {
        name: "checkout",
        logs: [
          `Cloning repository ${repo.url}...`,
          `Checking out branch ${pipeline.branch} (commit: ${pipeline.commitHash})...`,
          "Repository checkout successful."
        ]
      },
      {
        name: "build",
        logs: [
          `Running build script: ${repo.buildConfig?.buildCommand || "npm run build"}`,
          "Compiling assets and modules...",
          "Production build generated in dist/"
        ]
      },
      {
        name: "test",
        logs: [
          `Executing test suite: ${repo.buildConfig?.testCommand || "npm test"}`,
          "Running test runner...",
          "Passed 14 unit tests (0 failures)",
          "All test assertions verified."
        ]
      },
      {
        name: "docker_build",
        logs: [
          `Building container image from ${repo.buildConfig?.dockerfile || "Dockerfile"}...`,
          "Step 1/5: FROM node:20-alpine",
          "Step 2/5: WORKDIR /app",
          "Step 3/5: COPY package*.json ./",
          `Tagged container image ${repo.name.toLowerCase()}:${pipeline.commitHash}`
        ]
      },
      {
        name: "registry_push",
        logs: [
          `Connecting to registry ${repo.buildConfig?.registryUrl || "ghcr.io"}...`,
          `Pushing image layer sha256:${pipeline.commitHash}...`,
          "Image pushed successfully to GitHub Container Registry."
        ]
      },
      {
        name: "deploy",
        logs: [
          `Deploying image to ${repo.buildConfig?.targetEnvironment || "production"} target (Render)...`,
          "Verifying health check probe at /health...",
          "Health check passed: HTTP 200 OK",
          `Deployment active at https://${repo.name.split("/").pop()}.deployx.cloud`
        ]
      }
    ];

    const executionState = { cancelled: false };
    this.activeExecutions.set(pipelineId, executionState);

    try {
      for (let i = 0; i < pipeline.stages.length; i++) {
        if (executionState.cancelled) {
          pipeline.stages[i].status = "skipped";
          continue;
        }

        const stage = pipeline.stages[i];
        const config = stagesConfig[i];

        stage.status = "running";
        stage.startedAt = new Date().toISOString();
        this.emit("stage:start", { pipelineId, stageName: stage.name });

        for (const logLine of config.logs) {
          if (executionState.cancelled) break;
          // Short delay between logs
          await new Promise((r) => setTimeout(r, 150));
          const timestamp = new Date().toISOString();
          const formattedLog = `[${timestamp}] ${logLine}`;
          stage.logs.push(formattedLog);
          this.emit("pipeline:log", {
            pipelineId,
            stageName: stage.name,
            log: formattedLog
          });
        }

        if (executionState.cancelled) {
          stage.status = "cancelled";
          stage.finishedAt = new Date().toISOString();
          break;
        }

        stage.status = "success";
        stage.finishedAt = new Date().toISOString();
        this.emit("stage:complete", { pipelineId, stageName: stage.name, status: "success" });
      }

      const completedAt = new Date().toISOString();
      const durationMs = new Date(completedAt) - new Date(pipeline.startedAt);

      if (executionState.cancelled) {
        store.updatePipeline(pipelineId, {
          status: "cancelled",
          completedAt,
          durationMs
        });
        this.emit("pipeline:complete", { pipelineId, status: "cancelled" });
      } else {
        store.updatePipeline(pipelineId, {
          status: "success",
          completedAt,
          durationMs
        });

        // Create deployment record
        const deployment = store.createDeployment({
          pipelineId: pipeline.id,
          repoId: repo.id,
          repoName: repo.name,
          environment: repo.buildConfig?.targetEnvironment || "production",
          commitHash: pipeline.commitHash,
          imageTag: `${repo.buildConfig?.registryUrl || "ghcr.io/" + repo.name}:${pipeline.commitHash}`,
          url: `https://${repo.name.split("/").pop()}.deployx.cloud`,
          status: "active"
        });

        this.emit("pipeline:complete", { pipelineId, status: "success", deployment });
      }
    } catch (err) {
      store.updatePipeline(pipelineId, {
        status: "failed",
        completedAt: new Date().toISOString()
      });
      this.emit("pipeline:complete", { pipelineId, status: "failed", error: err.message });
    } finally {
      this.activeExecutions.delete(pipelineId);
    }
  }

  /**
   * Synchronous execution for rapid test suites
   */
  _executeSynchronously(pipeline, repo) {
    pipeline.status = "running";
    for (const stage of pipeline.stages) {
      stage.status = "success";
      stage.startedAt = new Date().toISOString();
      stage.finishedAt = new Date().toISOString();
      stage.logs = [
        `Starting stage ${stage.name}...`,
        `Executed step for ${repo.name}`,
        `Stage ${stage.name} completed successfully.`
      ];
    }
    const completedAt = new Date().toISOString();
    pipeline.status = "success";
    pipeline.completedAt = completedAt;
    pipeline.durationMs = 500;

    const deployment = store.createDeployment({
      pipelineId: pipeline.id,
      repoId: repo.id,
      repoName: repo.name,
      environment: repo.buildConfig?.targetEnvironment || "production",
      commitHash: pipeline.commitHash,
      imageTag: `${repo.buildConfig?.registryUrl || "ghcr.io/" + repo.name}:${pipeline.commitHash}`,
      url: `https://${repo.name.split("/").pop()}.deployx.cloud`,
      status: "active"
    });

    return { pipeline, deployment };
  }

  cancelPipeline(id) {
    const pipeline = store.getPipeline(id);
    if (!pipeline) return null;

    if (pipeline.status !== "running" && pipeline.status !== "queued") {
      throw new Error(`Cannot cancel pipeline with status '${pipeline.status}'`);
    }

    const execution = this.activeExecutions.get(id);
    if (execution) {
      execution.cancelled = true;
    }

    pipeline.status = "cancelled";
    pipeline.completedAt = new Date().toISOString();
    pipeline.durationMs = new Date(pipeline.completedAt) - new Date(pipeline.startedAt);

    for (const stage of pipeline.stages) {
      if (stage.status === "running") {
        stage.status = "cancelled";
        stage.finishedAt = new Date().toISOString();
        stage.logs.push(`[${new Date().toISOString()}] Stage cancelled by user`);
      } else if (stage.status === "pending") {
        stage.status = "skipped";
      }
    }

    store.updatePipeline(id, pipeline);
    this.emit("pipeline:cancelled", { pipelineId: id });
    return pipeline;
  }

  retryPipeline(id) {
    const original = store.getPipeline(id);
    if (!original) return null;

    return this.startPipeline({
      repoId: original.repoId,
      branch: original.branch,
      commitHash: original.commitHash,
      commitMessage: `Retry: ${original.commitMessage}`,
      author: original.author,
      trigger: "manual",
      simulateAsync: false
    });
  }
}

const pipelineService = new PipelineService();
module.exports = pipelineService;
