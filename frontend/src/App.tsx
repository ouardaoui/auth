import React, { useState, useEffect } from "react";
import { authAPI } from "./api";
import "./App.css";

interface User {
  username: string;
  loggedIn: boolean;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [testResult, setTestResult] = useState("");

  // Check authentication status on component mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // First check if we have a token
      if (!authAPI.isAuthenticated()) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Verify token with server
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
      setError("");
    } catch (error: any) {
      setError(
        error.response?.data?.error || "Login failed. Please try again."
      );
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
      setTestResult("");
    } catch (error) {
      console.error("Logout error:", error);
      // Even if logout fails, clear local state
      setUser(null);
    }
  };

  const testProtectedEndpoint = async () => {
    try {
      const response = await authAPI.callProtectedEndpoint({
        test: "data",
        timestamp: new Date().toISOString(),
      });
      setTestResult(JSON.stringify(response, null, 2));
    } catch (error: any) {
      setTestResult(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const debugTokens = () => {
    const tokens = authAPI.getCurrentTokens();
    console.log("Current tokens:", tokens);
    alert(
      `JWT: ${tokens.jwt ? "Present" : "Missing"}\nCSRF: ${
        tokens.csrf ? "Present" : "Missing"
      }\nExpiry: ${
        tokens.expiry
          ? new Date(parseInt(tokens.expiry)).toLocaleString()
          : "N/A"
      }`
    );
  };

  if (loading) {
    return <div className="app">Loading...</div>;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>React + JWT (localStorage) + CSRF</h1>

        {user ? (
          // Logged in view
          <div className="user-section">
            <div className="user-info">
              <p>
                Welcome, <strong>{user.username}</strong>! 🎉
              </p>
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </div>

            <div className="test-section">
              <h3>Test Protected Endpoint</h3>
              <button onClick={testProtectedEndpoint} className="test-btn">
                Call Protected API
              </button>
              <button onClick={debugTokens} className="debug-btn">
                Debug Tokens
              </button>
              {testResult && <pre className="test-result">{testResult}</pre>}
            </div>
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
              autoFocus
            />
            <button type="submit" className="login-btn">
              Login
            </button>
          </form>
        )}

        <div className="info-section">
          <h3>⚠️ Security Note</h3>
          <p>
            This implementation stores JWT in localStorage which is vulnerable
            to XSS attacks. For production, use httpOnly cookies instead.
          </p>
        </div>
      </header>
    </div>
  );
}

export default App;
