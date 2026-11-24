const crypto = require("node:crypto");
const store = require("../store");

const JWT_SECRET = process.env.JWT_SECRET || "deployx-jwt-secret-key";
const TOKEN_TTL_MS = 7 * 24 * 3600 * 1000; // 7 days

/**
 * Generates a standard HS256 JWT using Node's native crypto module
 */
function generateToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: now,
      exp: now + Math.floor(TOKEN_TTL_MS / 1000)
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

/**
 * Verifies an HS256 JWT and returns the decoded payload or null
 */
function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  if (store.isTokenRevoked(token)) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expectedSig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  try {
    const sigBuf = Buffer.from(signature, "utf8");
    const expectedBuf = Buffer.from(expectedSig, "utf8");
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) return null;

    return decoded;
  } catch {
    return null;
  }
}

/**
 * Express middleware to require a valid Bearer token
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Missing or invalid Authorization Bearer token"
    });
  }

  const token = authHeader.slice(7).trim();
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Token is invalid, expired, or has been revoked"
    });
  }

  const user = store.findUserById(decoded.sub);
  if (!user) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "User no longer exists"
    });
  }

  req.user = store.sanitizeUser(user);
  req.token = token;
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken
};
