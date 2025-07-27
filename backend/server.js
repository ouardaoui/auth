const express = require("express");
const session = require("express-session");
const { RedisStore } = require("connect-redis"); // Destructured import for v9.x
const { createClient } = require("redis"); // Use redis package instead of ioredis
const cors = require("cors");
require("dotenv").config();

const app = express();

// 🔗 Connect to Redis
const redisClient = createClient({
  url: "redis://redis:6379", // Use URL format for redis package
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
    store: new RedisStore({ client: redisClient }), // No longer need to call as function
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // change to true if using https
      sameSite: "strict",
      maxAge: 1000 * 60 * 60, // 1 hour
    },
  })
);

// ✅ Basic routes
app.post("/login", (req, res) => {
  const { username } = req.body;
  if (username) {
    req.session.username = username;
    res.json({ message: "Logged in", username });
  } else {
    res.status(400).json({ error: "Username required" });
  }
});

app.get("/me", (req, res) => {
  if (req.session.username) {
    res.json({ loggedIn: true, username: req.session.username });
  } else {
    res.json({ loggedIn: false });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out" });
  });
});

app.post("/say-hello", (req, res) => {
  res.json(`Hello`);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
