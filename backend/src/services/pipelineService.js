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
    const project = options.projectId ? store.getProject(options.projectId) : null;
    const repo = options.projectId ? null : store.getRepository(options.repoId);
    if (options.projectId && !project) {
      throw new Error(`Project with ID '${options.projectId}' not found`);
    }
    if (!options.projectId && !repo) {
      throw new Error(`Repository with ID or name '${options.repoId}' not found`);
    }

    const target = project
      ? {
          id: project.id,
          projectId: project.id,
          repoId: null,
          name: project.name,
          url: project.sourceRepositoryUrl,
          liveUrl: project.url,
          platform: project.platform,
          defaultBranch: project.defaultBranch,
          buildConfig: project.buildConfig
        }
      : {
          id: repo.id,
          projectId: null,
          repoId: repo.id,
          name: repo.name,
          url: repo.url,
          liveUrl: null,
          platform: null,
          defaultBranch: repo.defaultBranch,
          buildConfig: repo.buildConfig
        };

    const pipeline = store.createPipeline({
      projectId: target.projectId,
      repoId: target.repoId,
      repoName: target.name,
      url: null,
      platform: target.platform,
      branch: options.branch || target.defaultBranch || "main",
      commitHash: options.commitHash || Math.random().toString(16).substring(2, 9),
      commitMessage: options.commitMessage || "Manual deployment trigger",
      author: options.author || "DeployX Engineer",
      trigger: options.trigger || "manual",
      status: "queued"
    });

    this.emit("pipeline:queued", pipeline);

    if (options.simulateAsync === false) {
      // Synchronous execution (useful for deterministic unit testing)
      return this._executeSynchronously(pipeline, target);
    }

    // Default: Asynchronous progression with timer ticks
    this._runPipelineAsync(pipeline.id, target);
    return pipeline;
  }

  /**
   * Run stages asynchronously with small delays for live streaming
   */
  async _runPipelineAsync(pipelineId, target) {
    const pipeline = store.getPipeline(pipelineId);
    if (!pipeline) return;

    pipeline.status = "running";
    store.updatePipeline(pipelineId, { status: "running" });
    this.emit("pipeline:status", { pipelineId, status: "running" });

    const stagesConfig = [
      {
        name: "checkout",
        logs: [
          `SIMULATION ONLY: source retrieval for ${target.name} was not executed.`,
          target.url
            ? `Configured source: ${target.url}`
            : "No source repository is connected yet.",
          `Planned branch: ${pipeline.branch} (commit reference: ${pipeline.commitHash}).`
        ]
      },
      {
        name: "build",
        logs: [
          `SIMULATION ONLY: ${target.buildConfig?.buildCommand || "npm run build"} was not executed.`,
          "No application artifacts were created."
        ]
      },
      {
        name: "test",
        logs: [
          `SIMULATION ONLY: ${target.buildConfig?.testCommand || "npm test"} was not executed.`,
          "No tests were run and no test results were produced."
        ]
      },
      {
        name: "docker_build",
        logs: [
          `SIMULATION ONLY: no Docker image was built from ${target.buildConfig?.dockerfile || "Dockerfile"}.`,
          "No container artifacts were created."
        ]
      },
      {
        name: "registry_push",
        logs: [
          `SIMULATION ONLY: no image was pushed to ${target.buildConfig?.registryUrl || "a container registry"}.`,
          "No registry was contacted."
        ]
      },
      {
        name: "deploy",
        logs: [
          `SIMULATION ONLY: ${target.platform || target.buildConfig?.targetEnvironment || "the deployment target"} was not contacted.`,
          "No deployment was performed; any existing live site remains unchanged."
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
          projectId: target.projectId,
          repoId: target.repoId,
          repoName: target.name,
          environment: target.buildConfig?.targetEnvironment || "production",
          commitHash: pipeline.commitHash,
          imageTag: null,
          url: null,
          status: "simulated",
          source: "simulation"
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
  _executeSynchronously(pipeline, target) {
    pipeline.status = "running";
    for (const stage of pipeline.stages) {
      stage.status = "success";
      stage.startedAt = new Date().toISOString();
      stage.finishedAt = new Date().toISOString();
      stage.logs = [
        `SIMULATION ONLY: stage ${stage.name} was not executed for ${target.name}.`,
        "No external build, test, registry, or deployment action was performed."
      ];
    }
    const completedAt = new Date().toISOString();
    pipeline.status = "success";
    pipeline.completedAt = completedAt;
    pipeline.durationMs = 500;

    const deployment = store.createDeployment({
      pipelineId: pipeline.id,
      projectId: target.projectId,
      repoId: target.repoId,
      repoName: target.name,
      environment: target.buildConfig?.targetEnvironment || "production",
      commitHash: pipeline.commitHash,
      imageTag: null,
      url: null,
      status: "simulated",
      source: "simulation"
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
      projectId: original.projectId,
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
