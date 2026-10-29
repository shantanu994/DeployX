const crypto = require("node:crypto");

class Store {
  constructor() {
    this.reset();
  }

  reset() {
    this.repositories = [
      {
        id: "repo-1",
        name: "DeployX-org/frontend",
        url: "https://github.com/DeployX-org/frontend.git",
        defaultBranch: "main",
        webhookSecret: "deployx-secret-key-123",
        buildConfig: {
          buildCommand: "npm run build",
          testCommand: "npm test",
          dockerfile: "Dockerfile",
          targetEnvironment: "production",
          registryUrl: "ghcr.io/deployx-org/frontend"
        },
        status: "active",
        createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
      },
      {
        id: "repo-2",
        name: "DeployX-org/backend",
        url: "https://github.com/DeployX-org/backend.git",
        defaultBranch: "main",
        webhookSecret: "deployx-secret-key-456",
        buildConfig: {
          buildCommand: "npm install",
          testCommand: "npm test",
          dockerfile: "Dockerfile",
          targetEnvironment: "production",
          registryUrl: "ghcr.io/deployx-org/backend"
        },
        status: "active",
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
      }
    ];

    this.pipelines = [
      {
        id: "pipe-101",
        repoId: "repo-1",
        repoName: "DeployX-org/frontend",
        branch: "main",
        commitHash: "185da3c",
        commitMessage: "feat: add dashboard overview UI",
        author: "sharva-k",
        status: "success",
        trigger: "webhook",
        startedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 3480 * 1000).toISOString(),
        durationMs: 120000,
        stages: [
          {
            id: "stage-1",
            name: "checkout",
            status: "success",
            startedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
            finishedAt: new Date(Date.now() - 3590 * 1000).toISOString(),
            logs: [
              "Cloning repository https://github.com/DeployX-org/frontend.git...",
              "Checking out commit 185da3c on branch main",
              "Checkout completed successfully in 10s"
            ]
          },
          {
            id: "stage-2",
            name: "build",
            status: "success",
            startedAt: new Date(Date.now() - 3590 * 1000).toISOString(),
            finishedAt: new Date(Date.now() - 3550 * 1000).toISOString(),
            logs: [
              "Running build command: npm run build",
              "vite v8.0.0 building for production...",
              "transforming (24) modules",
              "dist/index.html   0.45 kB",
              "dist/assets/index.js   142.30 kB",
              "Build succeeded in 40s"
            ]
          },
          {
            id: "stage-3",
            name: "test",
            status: "success",
            startedAt: new Date(Date.now() - 3550 * 1000).toISOString(),
            finishedAt: new Date(Date.now() - 3530 * 1000).toISOString(),
            logs: [
              "Running test suite: npm test",
              "✔ Frontend component renders correctly",
              "✔ Route navigation functions without errors",
              "All 2 tests passed"
            ]
          },
          {
            id: "stage-4",
            name: "docker_build",
            status: "success",
            startedAt: new Date(Date.now() - 3530 * 1000).toISOString(),
            finishedAt: new Date(Date.now() - 3505 * 1000).toISOString(),
            logs: [
              "Building Docker container image...",
              "Step 1/6 : FROM node:20-alpine",
              "Step 2/6 : WORKDIR /app",
              "Step 3/6 : COPY . .",
              "Successfully tagged deployx-frontend:185da3c"
            ]
          },
          {
            id: "stage-5",
            name: "registry_push",
            status: "success",
            startedAt: new Date(Date.now() - 3505 * 1000).toISOString(),
            finishedAt: new Date(Date.now() - 3490 * 1000).toISOString(),
            logs: [
              "Pushing image to ghcr.io/deployx-org/frontend:185da3c",
              "Push completed. Digest: sha256:7f9b8c2d1e0a"
            ]
          },
          {
            id: "stage-6",
            name: "deploy",
            status: "success",
            startedAt: new Date(Date.now() - 3490 * 1000).toISOString(),
            finishedAt: new Date(Date.now() - 3480 * 1000).toISOString(),
            logs: [
              "Triggering deployment to Render production environment...",
              "Service deployx-frontend updated to version 185da3c",
              "Live at https://deployx-frontend.onrender.com"
            ]
          }
        ]
      }
    ];

    this.deployments = [
      {
        id: "dep-101",
        pipelineId: "pipe-101",
        repoId: "repo-1",
        repoName: "DeployX-org/frontend",
        environment: "production",
        version: "v1.0.1",
        commitHash: "185da3c",
        imageTag: "ghcr.io/deployx-org/frontend:185da3c",
        url: "https://deployx-frontend.onrender.com",
        status: "active",
        deployedAt: new Date(Date.now() - 3480 * 1000).toISOString(),
        rolledBackFrom: null
      }
    ];

    this.secrets = [
      {
        id: "sec-1",
        repoId: "repo-1",
        key: "VITE_API_URL",
        value: "https://api.deployx.dev",
        isSecret: false,
        createdAt: new Date().toISOString()
      },
      {
        id: "sec-2",
        repoId: "repo-1",
        key: "GITHUB_TOKEN",
        value: "ghp_secureSampleTokenForDeployment9876",
        isSecret: true,
        createdAt: new Date().toISOString()
      }
    ];
  }

  // Repositories
  listRepositories() {
    return this.repositories;
  }

  getRepository(id) {
    return this.repositories.find((r) => r.id === id || r.name === id);
  }

  createRepository(data) {
    const newRepo = {
      id: `repo-${crypto.randomUUID().slice(0, 8)}`,
      name: data.name,
      url: data.url,
      defaultBranch: data.defaultBranch || "main",
      webhookSecret: data.webhookSecret || crypto.randomBytes(16).toString("hex"),
      buildConfig: data.buildConfig || {
        buildCommand: "npm run build",
        testCommand: "npm test",
        dockerfile: "Dockerfile",
        targetEnvironment: "production",
        registryUrl: `ghcr.io/${data.name.toLowerCase()}`
      },
      status: "active",
      createdAt: new Date().toISOString()
    };
    this.repositories.push(newRepo);
    return newRepo;
  }

  updateRepository(id, updates) {
    const index = this.repositories.findIndex((r) => r.id === id);
    if (index === -1) return null;
    this.repositories[index] = {
      ...this.repositories[index],
      ...updates
    };
    return this.repositories[index];
  }

  deleteRepository(id) {
    const index = this.repositories.findIndex((r) => r.id === id);
    if (index === -1) return false;
    this.repositories.splice(index, 1);
    return true;
  }

  // Pipelines
  listPipelines(filters = {}) {
    let result = [...this.pipelines];
    if (filters.repoId) {
      result = result.filter((p) => p.repoId === filters.repoId);
    }
    if (filters.status) {
      result = result.filter((p) => p.status === filters.status);
    }
    result.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    if (filters.limit) {
      result = result.slice(0, Number(filters.limit));
    }
    return result;
  }

  getPipeline(id) {
    return this.pipelines.find((p) => p.id === id);
  }

  createPipeline(data) {
    const newPipeline = {
      id: `pipe-${crypto.randomUUID().slice(0, 8)}`,
      repoId: data.repoId,
      repoName: data.repoName || "unknown",
      branch: data.branch || "main",
      commitHash: data.commitHash || crypto.randomBytes(4).toString("hex"),
      commitMessage: data.commitMessage || "Manual deployment trigger",
      author: data.author || "DeployX User",
      status: data.status || "queued",
      trigger: data.trigger || "manual",
      startedAt: new Date().toISOString(),
      completedAt: null,
      durationMs: null,
      stages: [
        { id: "stage-1", name: "checkout", status: "pending", startedAt: null, finishedAt: null, logs: [] },
        { id: "stage-2", name: "build", status: "pending", startedAt: null, finishedAt: null, logs: [] },
        { id: "stage-3", name: "test", status: "pending", startedAt: null, finishedAt: null, logs: [] },
        { id: "stage-4", name: "docker_build", status: "pending", startedAt: null, finishedAt: null, logs: [] },
        { id: "stage-5", name: "registry_push", status: "pending", startedAt: null, finishedAt: null, logs: [] },
        { id: "stage-6", name: "deploy", status: "pending", startedAt: null, finishedAt: null, logs: [] }
      ]
    };
    this.pipelines.unshift(newPipeline);
    return newPipeline;
  }

  updatePipeline(id, updates) {
    const index = this.pipelines.findIndex((p) => p.id === id);
    if (index === -1) return null;
    this.pipelines[index] = {
      ...this.pipelines[index],
      ...updates
    };
    return this.pipelines[index];
  }

  // Deployments
  listDeployments(filters = {}) {
    let result = [...this.deployments];
    if (filters.repoId) {
      result = result.filter((d) => d.repoId === filters.repoId);
    }
    if (filters.environment) {
      result = result.filter((d) => d.environment === filters.environment);
    }
    if (filters.status) {
      result = result.filter((d) => d.status === filters.status);
    }
    result.sort((a, b) => new Date(b.deployedAt) - new Date(a.deployedAt));
    return result;
  }

  getDeployment(id) {
    return this.deployments.find((d) => d.id === id);
  }

  createDeployment(data) {
    // If new deployment is active, mark previously active deployments for the same repo and env as 'superseded'
    if (data.status === "active") {
      for (const dep of this.deployments) {
        if (
          dep.repoId === data.repoId &&
          dep.environment === (data.environment || "production") &&
          dep.status === "active"
        ) {
          dep.status = "superseded";
        }
      }
    }

    const newDep = {
      id: `dep-${crypto.randomUUID().slice(0, 8)}`,
      pipelineId: data.pipelineId,
      repoId: data.repoId,
      repoName: data.repoName || "unknown",
      environment: data.environment || "production",
      version: data.version || `v1.0.${this.deployments.length + 1}`,
      commitHash: data.commitHash,
      imageTag: data.imageTag || `ghcr.io/${data.repoName || "app"}:${data.commitHash}`,
      url: data.url || `https://${(data.repoName || "app").split("/").pop()}.deployx.cloud`,
      status: data.status || "active",
      deployedAt: new Date().toISOString(),
      rolledBackFrom: data.rolledBackFrom || null
    };

    this.deployments.unshift(newDep);
    return newDep;
  }

  // Secrets & Environment Variables
  listSecrets(repoId) {
    return this.secrets.filter((s) => s.repoId === repoId);
  }

  setSecret(repoId, key, value, isSecret = false) {
    const existingIndex = this.secrets.findIndex(
      (s) => s.repoId === repoId && s.key === key
    );

    if (existingIndex !== -1) {
      this.secrets[existingIndex].value = value;
      this.secrets[existingIndex].isSecret = isSecret;
      return this.secrets[existingIndex];
    }

    const newSecret = {
      id: `sec-${crypto.randomUUID().slice(0, 8)}`,
      repoId,
      key,
      value,
      isSecret,
      createdAt: new Date().toISOString()
    };
    this.secrets.push(newSecret);
    return newSecret;
  }

  deleteSecret(repoId, key) {
    const initialLength = this.secrets.length;
    this.secrets = this.secrets.filter(
      (s) => !(s.repoId === repoId && (s.key === key || s.id === key))
    );
    return this.secrets.length < initialLength;
  }
}

const store = new Store();
module.exports = store;
