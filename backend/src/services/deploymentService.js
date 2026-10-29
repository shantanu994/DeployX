const store = require("../store");

class DeploymentService {
  listDeployments(filters) {
    return store.listDeployments(filters);
  }

  getDeployment(id) {
    return store.getDeployment(id);
  }

  rollback(targetDeploymentId) {
    const targetDeployment = store.getDeployment(targetDeploymentId);
    if (!targetDeployment) {
      throw new Error(`Target deployment '${targetDeploymentId}' not found`);
    }

    const currentDeployments = store.listDeployments({
      repoId: targetDeployment.repoId,
      environment: targetDeployment.environment
    });

    const activeDeployment = currentDeployments.find((d) => d.status === "active");
    if (activeDeployment && activeDeployment.id === targetDeployment.id) {
      throw new Error("Target deployment is already the active deployment");
    }

    // Create a new rollback deployment
    const rolledBackDeployment = store.createDeployment({
      pipelineId: targetDeployment.pipelineId,
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
