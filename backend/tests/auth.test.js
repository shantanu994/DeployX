const { test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../server");

test("POST /api/auth/login authenticates seeded admin user", async () => {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@deployx.dev", password: "admin123" });

  assert.equal(response.status, 200);
  assert.ok(response.body.token);
  assert.equal(response.body.user.email, "admin@deployx.dev");
  assert.equal(response.body.user.passwordHash, undefined);
  assert.equal(response.body.user.passwordSalt, undefined);
});

test("POST /api/auth/signin alias works identically to /login", async () => {
  const response = await request(app)
    .post("/api/auth/signin")
    .send({ email: "admin@deployx.dev", password: "admin123" });

  assert.equal(response.status, 200);
  assert.ok(response.body.token);
});

test("POST /api/auth/login rejects invalid password", async () => {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@deployx.dev", password: "wrongpassword" });

  assert.equal(response.status, 401);
  assert.equal(response.body.error, "Unauthorized");
});

test("POST /api/auth/login validates missing credentials", async () => {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@deployx.dev" });

  assert.equal(response.status, 400);
});

test("POST /api/auth/register creates a new user and returns JWT", async () => {
  const response = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Test Engineer",
      email: "engineer@deployx.dev",
      password: "securePassword1"
    });

  assert.equal(response.status, 201);
  assert.ok(response.body.token);
  assert.equal(response.body.user.email, "engineer@deployx.dev");
  assert.equal(response.body.user.name, "Test Engineer");
  assert.equal(response.body.user.passwordHash, undefined);
});

test("POST /api/auth/register rejects duplicate email", async () => {
  const response = await request(app)
    .post("/api/auth/register")
    .send({
      email: "admin@deployx.dev",
      password: "anotherPassword123"
    });

  assert.equal(response.status, 409);
});

test("POST /api/auth/register validates email format and password length", async () => {
  const badEmail = await request(app)
    .post("/api/auth/register")
    .send({ email: "not-an-email", password: "password123" });
  assert.equal(badEmail.status, 400);

  const shortPassword = await request(app)
    .post("/api/auth/register")
    .send({ email: "valid@deployx.dev", password: "123" });
  assert.equal(shortPassword.status, 400);
});

test("GET /api/auth/me returns user profile with valid token and 401 without", async () => {
  const noToken = await request(app).get("/api/auth/me");
  assert.equal(noToken.status, 401);

  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@deployx.dev", password: "admin123" });

  const meRes = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${loginRes.body.token}`);

  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.user.email, "admin@deployx.dev");
});

test("POST /api/auth/logout revokes the token", async () => {
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@deployx.dev", password: "admin123" });

  const token = loginRes.body.token;

  const logoutRes = await request(app)
    .post("/api/auth/logout")
    .set("Authorization", `Bearer ${token}`);
  assert.equal(logoutRes.status, 200);

  const afterLogout = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${token}`);
  assert.equal(afterLogout.status, 401);
});
