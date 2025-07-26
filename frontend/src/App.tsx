import React, { useState, useEffect } from "react";
import { authAPI } from "./api";
import { User } from "./types";
import "./App.css";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  // Check authentication status on component mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await authAPI.me();
      if (response.loggedIn && response.username) {
        setUser({ username: response.username, loggedIn: true });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    try {
      const response = await authAPI.login(username);
      setUser({ username: response.username, loggedIn: true });
      setUsername("");
    } catch (error) {
      setError("Login failed. Please try again.");
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return <div className="app">Loading...</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>React + Redis Sessions</h1>

        {user ? (
          // Logged in view
          <div className="user-info">
            <p>Welcome, {user.username}! 🎉</p>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        ) : (
          // Login form
          <form onSubmit={handleLogin} className="login-form">
            <h2>Login</h2>
            {error && <p className="error">{error}</p>}
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="username-input"
            />
            <button type="submit" className="login-btn">
              Login
            </button>
          </form>
        )}
      </header>
    </div>
  );
}

export default App;
