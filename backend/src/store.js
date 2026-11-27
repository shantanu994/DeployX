const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

class Store {
  constructor() {
    this.reset();
    this._loadFromDisk();
  }

  _getDataFile() {
    return process.env.DATA_FILE || null;
  }

  _loadFromDisk() {
    const file = this._getDataFile();
    if (!file) return;
    try {
      if (fs.existsSync(file)) {
        const raw = JSON.parse(fs.readFileSync(file, "utf8"));
        if (Array.isArray(raw.projects)) this.projects = raw.projects;
        if (Array.isArray(raw.repositories)) this.repositories = raw.repositories;
        if (Array.isArray(raw.pipelines)) {
          this.pipelines = raw.pipelines
            .filter((pipeline) => pipeline.trigger !== "external")
            .map((pipeline) => pipeline.executionMode ? pipeline : {
              ...pipeline,
              executionMode: "simulation",
              stages: (pipeline.stages || []).map((stage) => ({
                ...stage,
                logs: ["SIMULATION ONLY: this historical run was not executed against external services."]
              }))
            });
        }
        if (Array.isArray(raw.deployments)) this.deployments = raw.deployments;
        if (Array.isArray(raw.secrets)) this.secrets = raw.secrets;
        if (Array.isArray(raw.users)) this.users = raw.users;
        this.deployments = this.deployments.map((deployment) => {
          const project = this.projects.find((item) => item.url === deployment.url);
          if (project) {
            return {
              ...deployment,
              projectId: project.id,
              repoId: null,
              repoName: project.name,
              pipelineId: null,
              imageTag: null,
              commitHash: null,
              version: "Live",
              status: "active",
              source: "external",
              deployedAt: null
            };
          }

          const pipeline = this.pipelines.find((item) => item.id === deployment.pipelineId);
          if (pipeline?.executionMode === "simulation") {
            return {
              ...deployment,
              status: deployment.status === "active" ? "simulated" : deployment.status,
              source: "simulation",
              imageTag: null,
              url: null
            };
          }
          return deployment;
        });
      } else {
        this._saveToDisk();
      }
    } catch (err) {
      console.error("Failed to load DATA_FILE, falling back to seeded defaults:", err.message);
    }
  }

  _saveToDisk() {
    const file = this._getDataFile();
    if (!file) return;
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(
        file,
        JSON.stringify(
          {
            projects: this.projects,
            repositories: this.repositories,
            pipelines: this.pipelines,
            deployments: this.deployments,
            secrets: this.secrets,
            users: this.users
          },
          null,
          2
        )
      );
    } catch (err) {
      console.error("Failed to persist DATA_FILE:", err.message);
    }
  }

  reset() {
    this.revokedTokens = new Set();
    this.projects = [
      {
        id: "project-cloudkitchen-ai",
        name: "CloudKitchen AI",
        description: "AI-powered cashflow management platform for cloud kitchens.",
        platform: "Vercel",
        url: "https://ai-powered-cashflow-operating-system-for-cloud-kitch-1e8ljezix.vercel.app/",
        status: "active",
        defaultBranch: "main",
        sourceRepositoryUrl: null,
        buildConfig: {
          buildCommand: "npm run build",
          testCommand: "npm test",
          dockerfile: "Dockerfile",
          targetEnvironment: "Vercel production",
          registryUrl: null
        },
        createdAt: new Date().toISOString()
      },
      {
        id: "project-attendance-tracker",
        name: "Attendance Tracker",
        description: "Personalized attendance tracking and management platform.",
        platform: "Vercel",
        url: "https://personalized-attendance-tracking.vercel.app/",
        status: "active",
        defaultBranch: "main",
        sourceRepositoryUrl: null,
        buildConfig: {
          buildCommand: "npm run build",
          testCommand: "npm test",
          dockerfile: "Dockerfile",
          targetEnvironment: "Vercel production",
          registryUrl: null
        },
        createdAt: new Date().toISOString()
      }
    ];

    const defaultPassword = this._hashPassword("admin123");
    this.users = [
      {
        id: "user-1",
        name: "DeployX Admin",
        email: "admin@deployx.dev",
        role: "admin",
        passwordHash: defaultPassword.hash,
        passwordSalt: defaultPassword.salt,
        createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
      }
    ];

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
        projectId: null,
        executionMode: "simulation",
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
            logs: ["SIMULATION ONLY: source retrieval was not executed."]
          },
          {
            id: "stage-2",
            name: "build",
            status: "success",
            startedAt: new Date(Date.now() - 3590 * 1000).toISOString(),
            finishedAt: new Date(Date.now() - 3550 * 1000).toISOString(),
            logs: ["SIMULATION ONLY: npm run build was not executed."]
          },
          {
            id: "stage-3",
            name: "test",
            status: "success",
            startedAt: new Date(Date.now() - 3550 * 1000).toISOString(),
            finishedAt: new Date(Date.now() - 3530 * 1000).toISOString(),
            logs: ["SIMULATION ONLY: automated tests were not run."]
          },
          {
            id: "stage-4",
            name: "docker_build",
            status: "success",
            startedAt: new Date(Date.now() - 3530 * 1000).toISOString(),
            finishedAt: new Date(Date.now() - 3505 * 1000).toISOString(),
            logs: ["SIMULATION ONLY: no Docker image was built."]
          },
          {
            id: "stage-5",
            name: "registry_push",
            status: "success",
            startedAt: new Date(Date.now() - 3505 * 1000).toISOString(),
            finishedAt: new Date(Date.now() - 3490 * 1000).toISOString(),
            logs: ["SIMULATION ONLY: no image was pushed to a registry."]
          },
          {
            id: "stage-6",
            name: "deploy",
            status: "success",
            startedAt: new Date(Date.now() - 3490 * 1000).toISOString(),
            finishedAt: new Date(Date.now() - 3480 * 1000).toISOString(),
            logs: ["SIMULATION ONLY: no deployment provider was contacted."]
          }
        ]
      },
    ];

    this.deployments = [
      {
        id: "dep-101",
        pipelineId: "pipe-101",
        projectId: null,
        repoId: "repo-1",
        repoName: "DeployX-org/frontend",
        environment: "production",
        version: "v1.0.1",
        commitHash: "185da3c",
        imageTag: null,
        url: null,
        status: "simulated",
        source: "simulation",
        deployedAt: new Date(Date.now() - 3480 * 1000).toISOString(),
        rolledBackFrom: null
      },
      {
        id: "dep-ext-102",
        pipelineId: null,
        projectId: "project-cloudkitchen-ai",
        repoId: null,
        repoName: "CloudKitchen AI",
        environment: "production",
        version: "Live",
        commitHash: null,
        imageTag: null,
        url: "https://ai-powered-cashflow-operating-system-for-cloud-kitch-1e8ljezix.vercel.app/",
        status: "active",
        source: "external",
        deployedAt: null,
        rolledBackFrom: null
      },
      {
        id: "dep-ext-103",
        pipelineId: null,
        projectId: "project-attendance-tracker",
        repoId: null,
        repoName: "Attendance Tracker",
        environment: "production",
        version: "Live",
        commitHash: null,
        imageTag: null,
        url: "https://personalized-attendance-tracking.vercel.app/",
        status: "active",
        source: "external",
        deployedAt: null,
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
  listProjects() {
    return this.projects.map((project) => {
      const pipelines = this.listPipelines({ projectId: project.id });
      const deployments = this.listDeployments({ projectId: project.id });
      return {
        ...project,
        pipelineRunsCount: pipelines.length,
        lastPipeline: pipelines[0] || null,
        lastDeployment: deployments[0] || null
      };
    });
  }

  getProject(id) {
    return this.projects.find((project) => project.id === id);
  }

  getProjectDetails(id) {
    const project = this.getProject(id);
    if (!project) return null;

    const pipelines = this.listPipelines({ projectId: id });
    const deployments = this.listDeployments({ projectId: id });
    const recentLogs = pipelines
      .slice(0, 5)
      .flatMap((pipeline) =>
        [...pipeline.stages].reverse().flatMap((stage) =>
          [...stage.logs].reverse().map((message) => ({
            pipelineId: pipeline.id,
            pipelineStartedAt: pipeline.startedAt,
            stage: stage.name,
            status: stage.status,
            message
          }))
        )
      )
      .slice(0, 20);

    return {
      ...project,
      pipelineRunsCount: pipelines.length,
      lastPipeline: pipelines[0] || null,
      lastDeployment: deployments[0] || null,
      pipelines,
      deployments,
      recentLogs
    };
  }

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
    this._saveToDisk();
    return newRepo;
  }

  updateRepository(id, updates) {
    const index = this.repositories.findIndex((r) => r.id === id);
    if (index === -1) return null;
    this.repositories[index] = {
      ...this.repositories[index],
      ...updates
    };
    this._saveToDisk();
    return this.repositories[index];
  }

  deleteRepository(id) {
    const index = this.repositories.findIndex((r) => r.id === id);
    if (index === -1) return false;
    this.repositories.splice(index, 1);
    this._saveToDisk();
    return true;
  }

  // Pipelines
  listPipelines(filters = {}) {
    let result = [...this.pipelines];
    if (filters.projectId) {
      result = result.filter((pipeline) => pipeline.projectId === filters.projectId);
    }
    if (filters.repoId) {
      result = result.filter((p) => p.repoId === filters.repoId);
    }
    if (filters.status) {
      result = result.filter((p) => p.status === filters.status);
    }
    result.sort((a, b) => new Date(b.startedAt || 0) - new Date(a.startedAt || 0));
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
      projectId: data.projectId || null,
      executionMode: "simulation",
      repoId: data.repoId || null,
      repoName: data.repoName || "unknown",
      url: data.url || null,
      platform: data.platform || null,
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
    this._saveToDisk();
    return newPipeline;
  }

  updatePipeline(id, updates) {
    const index = this.pipelines.findIndex((p) => p.id === id);
    if (index === -1) return null;
    this.pipelines[index] = {
      ...this.pipelines[index],
      ...updates
    };
    this._saveToDisk();
    return this.pipelines[index];
  }

  // Deployments
  listDeployments(filters = {}) {
    let result = [...this.deployments];
    if (filters.projectId) {
      result = result.filter((deployment) => deployment.projectId === filters.projectId);
    }
    if (filters.repoId) {
      result = result.filter((d) => d.repoId === filters.repoId);
    }
    if (filters.environment) {
      result = result.filter((d) => d.environment === filters.environment);
    }
    if (filters.status) {
      result = result.filter((d) => d.status === filters.status);
    }
    result.sort((a, b) => new Date(b.deployedAt || 0) - new Date(a.deployedAt || 0));
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
          (data.projectId
            ? dep.projectId === data.projectId
            : !dep.projectId && dep.repoId === data.repoId) &&
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
      projectId: data.projectId || null,
      repoId: data.repoId || null,
      repoName: data.repoName || "unknown",
      environment: data.environment || "production",
      version: data.version || `v1.0.${this.deployments.length + 1}`,
      commitHash: data.commitHash,
      imageTag: data.imageTag || (data.source === "simulation" ? null : `ghcr.io/${data.repoName || "app"}:${data.commitHash}`),
      url: data.url || (data.source === "simulation" ? null : `https://${(data.repoName || "app").split("/").pop()}.deployx.cloud`),
      status: data.status || "active",
      source: data.source || "pipeline",
      deployedAt: new Date().toISOString(),
      rolledBackFrom: data.rolledBackFrom || null
    };

    this.deployments.unshift(newDep);
    this._saveToDisk();
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
      this._saveToDisk();
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
    this._saveToDisk();
    return newSecret;
  }

  deleteSecret(repoId, key) {
    const initialLength = this.secrets.length;
    this.secrets = this.secrets.filter(
      (s) => !(s.repoId === repoId && (s.key === key || s.id === key))
    );
    if (this.secrets.length < initialLength) {
      this._saveToDisk();
      return true;
    }
    return false;
  }

  // Users & Authentication
  _hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return { salt, hash };
  }

  verifyPassword(password, salt, expectedHash) {
    const hashBuffer = crypto.scryptSync(password, salt, 64);
    const expectedBuffer = Buffer.from(expectedHash, "hex");
    if (hashBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(hashBuffer, expectedBuffer);
  }

  findUserByEmail(email) {
    if (!email) return null;
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id) {
    return this.users.find((u) => u.id === id);
  }

  createUser({ email, password, name, role = "developer" }) {
    const { salt, hash } = this._hashPassword(password);
    const newUser = {
      id: `user-${crypto.randomUUID().slice(0, 8)}`,
      name: name || email.split("@")[0],
      email: email.toLowerCase(),
      role,
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: new Date().toISOString()
    };
    this.users.push(newUser);
    this._saveToDisk();
    return newUser;
  }

  sanitizeUser(user) {
    if (!user) return null;
    const { passwordHash, passwordSalt, ...safeUser } = user;
    return safeUser;
  }

  revokeToken(token) {
    this.revokedTokens.add(token);
  }

  isTokenRevoked(token) {
    return this.revokedTokens.has(token);
  }
}

const store = new Store();
module.exports = store;
