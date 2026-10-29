const express = require("express");
const cors = require("cors");
require("dotenv").config();

const webhookRoutes = require("./src/routes/webhookRoutes");
const repositoryRoutes = require("./src/routes/repositoryRoutes");
const pipelineRoutes = require("./src/routes/pipelineRoutes");
const deploymentRoutes = require("./src/routes/deploymentRoutes");
const secretRoutes = require("./src/routes/secretRoutes");
const dashboardRoutes = require("./src/routes/dashboardRoutes");

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for frontend integration
app.use(cors());

// Parse JSON request bodies while capturing raw bytes for webhook signature verification
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);

// URL-encoded body parser support
app.use(express.urlencoded({ extended: true }));

// Root route (DeployX backend verification)
app.get("/", (req, res) => {
  res.status(200).send(
    "DeployX backend - Cloud CI/CD Platform API is operational."
  );
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).type("text/plain").send("OK");
});

// Mount CI/CD platform API routes
app.use("/api/webhooks", webhookRoutes);
app.use("/webhook", webhookRoutes); // Alias for GitHub webhook configurations
app.use("/api/repositories", repositoryRoutes);
app.use("/api/repositories", secretRoutes);
app.use("/api/pipelines", pipelineRoutes);
app.use("/api/deployments", deploymentRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Global 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    error: "Internal Server Error",
    message: err.message || "An unexpected error occurred"
  });
});

if (require.main === module) {
  app.listen(port, "0.0.0.0", () => {
    console.log(`DeployX backend listening on port ${port}`);
  });
}

module.exports = app;
