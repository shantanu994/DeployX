const express = require("express");
const router = express.Router();
const store = require("../store");
const { generateToken, authenticateToken } = require("../middleware/authMiddleware");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Shared handler for user registration (/register and /signup)
 */
function handleRegister(req, res) {
  const { email, password, name } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Both 'email' and 'password' are required"
    });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Please provide a valid email address"
    });
  }

  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Password must be at least 6 characters long"
    });
  }

  const existing = store.findUserByEmail(email);
  if (existing) {
    return res.status(409).json({
      error: "Conflict",
      message: "An account with this email already exists"
    });
  }

  const user = store.createUser({ email, password, name });
  const token = generateToken(user);

  return res.status(201).json({
    message: "Account created successfully",
    token,
    user: store.sanitizeUser(user)
  });
}

/**
 * Shared handler for user sign in (/login and /signin)
 */
function handleLogin(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      error: "Bad Request",
      message: "Both 'email' and 'password' are required"
    });
  }

  const user = store.findUserByEmail(email);
  if (!user || !store.verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid email or password"
    });
  }

  const token = generateToken(user);

  return res.status(200).json({
    message: "Signed in successfully",
    token,
    user: store.sanitizeUser(user)
  });
}

router.post("/register", handleRegister);
router.post("/signup", handleRegister);

router.post("/login", handleLogin);
router.post("/signin", handleLogin);

/**
 * GET /api/auth/me
 * Returns the currently authenticated user profile
 */
router.get("/me", authenticateToken, (req, res) => {
  res.status(200).json({ user: req.user });
});

/**
 * POST /api/auth/logout
 * Revokes the current Bearer token
 */
router.post("/logout", authenticateToken, (req, res) => {
  store.revokeToken(req.token);
  res.status(200).json({ message: "Signed out successfully" });
});

module.exports = router;
