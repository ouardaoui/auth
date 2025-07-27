const express = require("express");
const session = require("express-session");
const { RedisStore } = require("connect-redis");
const { createClient } = require("redis");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();

const app = express();

// 🔗 Connect to Redis
const redisClient = createClient({
  url: "redis://redis:6379",
});
redisClient.connect().catch(console.error);

app.use(express.json());

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

// 🛠️ Setup sessions
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // change to true if using https
      sameSite: "lax",
      maxAge: 1000 * 60 * 60, // 1 hour
    },
  })
);

// 🔒 Custom CSRF Protection Middleware
const generateCSRFToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const csrfProtection = (req, res, next) => {
  // Skip CSRF protection for GET requests and /csrf-token endpoint
  if (req.method === "GET" || req.path === "/csrf-token") {
    return next();
  }

  const token = req.headers["x-csrf-token"] || req.body._csrf;
  const sessionToken = req.session.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      error: "Invalid CSRF token",
      code: "EBADCSRFTOKEN",
    });
  }

  next();
};

// Apply CSRF protection to all routes except GET and /csrf-token
app.use(csrfProtection);

// 🔑 Endpoint to get CSRF token
app.get("/csrf-token", (req, res) => {
  // Generate new CSRF token if one doesn't exist
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCSRFToken();
  }

  req.session.save((err) => {
    if (err) {
      console.error("Session save error:", err);
      return res.status(500).json({ error: "Failed to generate CSRF token" });
    }
    res.json({ csrfToken: req.session.csrfToken });
  });
});

// ✅ Protected routes with CSRF
app.post("/login", (req, res) => {
  const { username } = req.body;
  if (username) {
    req.session.username = username;
    // Generate new CSRF token after login for security
    req.session.csrfToken = generateCSRFToken();
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ error: "Login failed" });
      }
      res.json({
        message: "Logged in",
        username,
        csrfToken: req.session.csrfToken,
      });
    });
  } else {
    res.status(400).json({ error: "Username required" });
  }
});

app.get("/me", (req, res) => {
  if (req.session.username) {
    res.json({
      loggedIn: true,
      username: req.session.username,
      csrfToken: req.session.csrfToken,
    });
  } else {
    res.json({ loggedIn: false });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destroy error:", err);
      return res.status(500).json({ error: "Logout failed" });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out" });
  });
});

// 🔄 Endpoint to refresh CSRF token
app.post("/refresh-csrf", (req, res) => {
  req.session.csrfToken = generateCSRFToken();
  req.session.save((err) => {
    if (err) {
      console.error("Session save error:", err);
      return res.status(500).json({ error: "Failed to refresh CSRF token" });
    }
    res.json({ csrfToken: req.session.csrfToken });
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
