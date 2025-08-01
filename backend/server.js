const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// ✅ Allow React frontend to send cookies
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
const CSRF_TOKEN_LENGTH = 32;

// In-memory storage for CSRF tokens (use Redis in production)
const csrfTokenStore = new Map();

// 🔒 Generate CSRF Token
const generateCSRFToken = () => {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
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
  const token = req.cookies.jwt;

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
  // Skip CSRF protection for GET requests and specific endpoints
  if (
    req.method === "GET" ||
    req.path === "/csrf-token" ||
    req.path === "/login"
  ) {
    return next();
  }

  // Check if user is authenticated
  const token = req.cookies.jwt;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const csrfToken = req.headers["x-csrf-token"] || req.body._csrf;
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

// 🔑 Endpoint to get CSRF token (requires authentication)
app.get("/csrf-token", verifyJWT, (req, res) => {
  const userId = req.user.userId;
  let csrfToken = csrfTokenStore.get(userId);

  if (!csrfToken) {
    csrfToken = generateCSRFToken();
    csrfTokenStore.set(userId, csrfToken);
  }

  res.json({ csrfToken });
});

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

  // Set JWT in httpOnly cookie
  res.cookie("jwt", jwtToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 1000, // 1 hour
  });

  res.json({
    message: "Logged in",
    username,
    csrfToken,
  });
});

// 🔑 Check authentication status
app.get("/me", (req, res) => {
  const token = req.cookies.jwt;

  if (!token) {
    return res.json({ loggedIn: false });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const csrfToken = csrfTokenStore.get(decoded.userId);

    res.json({
      loggedIn: true,
      username: decoded.username,
      csrfToken: csrfToken || null,
    });
  } catch (error) {
    res.json({ loggedIn: false });
  }
});

// 🔑 Logout endpoint
app.post("/logout", csrfProtection, (req, res) => {
  // Clear CSRF token from store
  if (req.user && req.user.userId) {
    csrfTokenStore.delete(req.user.userId);
  }

  // Clear JWT cookie
  res.clearCookie("jwt");
  res.json({ message: "Logged out" });
});

// 🔄 Refresh CSRF token
app.post("/refresh-csrf", verifyJWT, (req, res) => {
  const userId = req.user.userId;
  const newCsrfToken = generateCSRFToken();
  csrfTokenStore.set(userId, newCsrfToken);

  res.json({ csrfToken: newCsrfToken });
});

// 🔄 Refresh JWT token (optional endpoint)
app.post("/refresh-token", verifyJWT, csrfProtection, (req, res) => {
  const { userId, username } = req.user;

  // Generate new JWT
  const newJwtToken = generateJWT(userId, username);

  // Generate new CSRF token
  const newCsrfToken = generateCSRFToken();
  csrfTokenStore.set(userId, newCsrfToken);

  // Set new JWT in cookie
  res.cookie("jwt", newJwtToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 1000, // 1 hour
  });

  res.json({
    message: "Token refreshed",
    csrfToken: newCsrfToken,
  });
});

// Example protected route
app.post("/api/protected", csrfProtection, (req, res) => {
  res.json({
    message: "This is a protected route",
    user: req.user.username,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
