
const { test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../server");

test("GET /health returns OK", async () => {
    const response = await request(app).get("/health");

    assert.equal(response.status, 200);
    assert.equal(response.text, "OK");
});

test("GET / returns the backend message", async () => {
    const response = await request(app).get("/");

    assert.equal(response.status, 200);
    assert.match(response.text, /DeployX backend/i);
});

test("Unknown routes return 404", async () => {
    const response = await request(app).get("/unknown-route");

    assert.equal(response.status, 404);
});
