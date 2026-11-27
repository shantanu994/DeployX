const express = require("express");
const router = express.Router();
const store = require("../store");

router.get("/", (req, res) => {
  const projects = store.listProjects();
  res.status(200).json({ count: projects.length, projects });
});

router.get("/:id", (req, res) => {
  const details = store.getProjectDetails(req.params.id);
  if (!details) {
    return res.status(404).json({ error: "Project not found" });
  }

  const { pipelines, deployments, recentLogs, ...project } = details;
  return res.status(200).json({ project, pipelines, deployments, recentLogs });
});

module.exports = router;
