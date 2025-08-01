const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();

const app = express();

// Middleware
app.use(express.json());

// ✅ Allow React frontend to send requests
app.use(
  cors({
    origin: [
      "http://localhost:3000", // React dev server
      "http://frontend:3000",
    ],
    credentials: true,
  })
);

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";
const JWT_EXPIRES_IN = "1h";

// In-memory storage for CSRF tokens (you can use Redis if preferred)
const csrfTokenStore = new Map();

// 🔒 Generate CSRF Token
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// 🔒 Generate JWT Token
const generateJWT = (userId, username) => {
  return jwt.sign(
    {
      userId,
      username,
      iat: Date.now(),
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// 🔒 Verify JWT Middleware
const verifyJWT = (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
};

// 🔒 CSRF Protection Middleware
const csrfProtection = (req, res, next) => {
  // Skip CSRF protection for GET requests and auth endpoints
  if (req.method === "GET" || ["/login", "/csrf-token"].includes(req.path)) {
    return next();
  }

  // Get JWT from header
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const csrfToken = req.headers["x-csrf-token"];
    const storedToken = csrfTokenStore.get(decoded.userId);

    if (!csrfToken || !storedToken || csrfToken !== storedToken) {
      return res.status(403).json({
        error: "Invalid CSRF token",
        code: "EBADCSRFTOKEN",
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid authentication" });
  }
};

// 🔑 Login endpoint
app.post("/login", async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username required" });
  }

  // In production, verify credentials against database
  // For demo, we'll use username as userId
  const userId = crypto.createHash("sha256").update(username).digest("hex");

  // Generate JWT
  const jwtToken = generateJWT(userId, username);

  // Generate CSRF token
  const csrfToken = generateCSRFToken();
  csrfTokenStore.set(userId, csrfToken);

  // Return tokens in response body (not as cookies)
  res.json({
    message: "Logged in",
    username,
    token: jwtToken, // JWT to be stored in localStorage
    csrfToken, // CSRF token
    expiresIn: 3600, // 1 hour in seconds
  });
});

// 🔑 Get CSRF token (requires authentication)
app.get("/csrf-token", verifyJWT, (req, res) => {
  const userId = req.user.userId;
  let csrfToken = csrfTokenStore.get(userId);

  if (!csrfToken) {
    csrfToken = generateCSRFToken();
    csrfTokenStore.set(userId, csrfToken);
  }

  res.json({ csrfToken });
});

// 🔑 Check authentication status
app.get("/me", verifyJWT, (req, res) => {
  const csrfToken = csrfTokenStore.get(req.user.userId);

  res.json({
    loggedIn: true,
    username: req.user.username,
    csrfToken: csrfToken || null,
  });
});

// 🔑 Logout endpoint
app.post("/logout", csrfProtection, (req, res) => {
  // Clear CSRF token from store
  if (req.user && req.user.userId) {
    csrfTokenStore.delete(req.user.userId);
  }

  // Client should remove JWT from localStorage
  res.json({ message: "Logged out" });
});

// 🔄 Refresh CSRF token
app.post("/refresh-csrf", verifyJWT, (req, res) => {
  const userId = req.user.userId;
  const newCsrfToken = generateCSRFToken();
  csrfTokenStore.set(userId, newCsrfToken);

  res.json({ csrfToken: newCsrfToken });
});

// 🔄 Refresh JWT token
app.post("/refresh-token", csrfProtection, (req, res) => {
  const { userId, username } = req.user;

  // Generate new JWT
  const newJwtToken = generateJWT(userId, username);

  // Generate new CSRF token
  const newCsrfToken = generateCSRFToken();
  csrfTokenStore.set(userId, newCsrfToken);

  res.json({
    message: "Token refreshed",
    token: newJwtToken,
    csrfToken: newCsrfToken,
    expiresIn: 3600,
  });
});

// Example protected route
app.post("/api/protected", verifyJWT, csrfProtection, (req, res) => {
  res.json({
    message: "This is a protected route",
    user: req.user.username,
    data: req.body,
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
