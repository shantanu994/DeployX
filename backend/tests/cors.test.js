const { test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../server");

test("CORS allows configured CORS_ORIGIN and blocks unauthorized origins", async () => {
  const prevOrigin = process.env.CORS_ORIGIN;
  process.env.CORS_ORIGIN = "https://deployx-frontend.onrender.com,http://localhost:5173";

  try {
    const allowedRes = await request(app)
      .get("/health")
      .set("Origin", "https://deployx-frontend.onrender.com");
    assert.equal(allowedRes.status, 200);
    assert.equal(
      allowedRes.headers["access-control-allow-origin"],
      "https://deployx-frontend.onrender.com"
    );

    const blockedRes = await request(app)
      .get("/health")
      .set("Origin", "https://malicious-site.example.com");
    assert.equal(blockedRes.status, 200);
    assert.equal(blockedRes.headers["access-control-allow-origin"], undefined);
  } finally {
    if (prevOrigin === undefined) {
      delete process.env.CORS_ORIGIN;
    } else {
      process.env.CORS_ORIGIN = prevOrigin;
    }
  }
});
