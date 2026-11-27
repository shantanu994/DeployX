const store = require("../store");

class DeploymentService {
  listDeployments(filters) {
    return store.listDeployments(filters);
  }

  getDeployment(id) {
    return store.getDeployment(id);
  }

  rollback(deploymentId) {
    const requested = store.getDeployment(deploymentId);
    if (!requested) {
      throw new Error(`Target deployment '${deploymentId}' not found`);
    }
    if (requested.source === "external") {
      throw new Error("Rollback is unavailable for externally managed deployments");
    }

    const currentDeployments = store.listDeployments({
      ...(requested.projectId ? { projectId: requested.projectId } : { repoId: requested.repoId }),
      environment: requested.environment
    });

    const activeDeployment = currentDeployments.find((d) => d.status === "active");
    let targetDeployment = requested;

    // If the caller passed the currently active deployment (as the dashboard UI does),
    // automatically pick the most recent previous deployment to roll back to.
    if (activeDeployment && activeDeployment.id === requested.id) {
      const previous = currentDeployments.find(
        (d) => d.id !== activeDeployment.id && d.status !== "failed"
      );
      if (!previous) {
        throw new Error(
          "Target deployment is already the active deployment and no previous deployment exists to roll back to"
        );
      }
      targetDeployment = previous;
    }

    // Create a new rollback deployment
    const rolledBackDeployment = store.createDeployment({
      pipelineId: targetDeployment.pipelineId,
      projectId: targetDeployment.projectId,
      repoId: targetDeployment.repoId,
      repoName: targetDeployment.repoName,
      environment: targetDeployment.environment,
      version: `${targetDeployment.version}-rollback.${Date.now().toString().slice(-4)}`,
      commitHash: targetDeployment.commitHash,
      imageTag: targetDeployment.imageTag,
      url: targetDeployment.url,
      status: "active",
      rolledBackFrom: activeDeployment ? activeDeployment.id : targetDeployment.id
    });

    return {
      message: `Successfully rolled back to deployment ${targetDeployment.id} (commit: ${targetDeployment.commitHash})`,
      deployment: rolledBackDeployment,
      revertedFrom: activeDeployment ? activeDeployment.id : null
    };
  }
}

const deploymentService = new DeploymentService();
module.exports = deploymentService;
