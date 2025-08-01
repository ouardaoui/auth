import axios, { AxiosResponse, AxiosError } from "axios";
import {
  LoginResponse,
  MeResponse,
  LogoutResponse,
  TokenResponse,
} from "./types";

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Token Management
const TOKEN_KEY = "jwt_token";
const CSRF_KEY = "csrf_token";
const TOKEN_EXPIRY_KEY = "token_expiry";

// Helper functions for token management
const saveTokens = (token: string, csrfToken: string, expiresIn: number) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(CSRF_KEY, csrfToken);
  const expiryTime = new Date().getTime() + expiresIn * 1000;
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
};

const getToken = (): string | null => {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

  if (!token || !expiry) return null;

  // Check if token is expired
  if (new Date().getTime() > parseInt(expiry)) {
    clearTokens();
    return null;
  }

  return token;
};

const getCsrfToken = (): string | null => {
  return localStorage.getItem(CSRF_KEY);
};

const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CSRF_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
};

// Axios Request Interceptor - Add JWT and CSRF tokens to requests
api.interceptors.request.use(
  (config) => {
    // Add JWT token to Authorization header
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add CSRF token for mutating requests
    if (
      ["post", "put", "patch", "delete"].includes(
        config.method?.toLowerCase() || ""
      )
    ) {
      const csrfToken = getCsrfToken();
      if (csrfToken && config.url !== "/login") {
        config.headers["X-CSRF-Token"] = csrfToken;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Axios Response Interceptor - Handle token expiration and CSRF errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    // Handle token expiration
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // If it's a token expired error, try to refresh
      if ((error.response.data as any)?.error === "Token expired") {
        try {
          const response = await authAPI.refreshToken();
          return api.request(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          clearTokens();
          window.location.href = "/login";
          return Promise.reject(error);
        }
      }

      // Other 401 errors - clear tokens
      clearTokens();
    }

    // Handle CSRF token errors
    if (
      error.response?.status === 403 &&
      (error.response.data as any)?.code === "EBADCSRFTOKEN" &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        // Refresh CSRF token
        const response = await authAPI.refreshCsrfToken();
        return api.request(originalRequest);
      } catch (csrfError) {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// API Methods
export const authAPI = {
  // Login
  login: async (username: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>("/login", { username });

    // Save tokens to localStorage
    saveTokens(
      response.data.token,
      response.data.csrfToken,
      response.data.expiresIn
    );

    return response.data;
  },

  // Check authentication status
  me: async (): Promise<MeResponse> => {
    try {
      const response = await api.get<MeResponse>("/me");

      // Update CSRF token if provided
      if (response.data.csrfToken) {
        localStorage.setItem(CSRF_KEY, response.data.csrfToken);
      }

      return response.data;
    } catch (error) {
      // If request fails, user is not authenticated
      return { loggedIn: false };
    }
  },

  // Logout
  logout: async (): Promise<LogoutResponse> => {
    try {
      const response = await api.post<LogoutResponse>("/logout");
      return response.data;
    } finally {
      // Always clear tokens, even if request fails
      clearTokens();
    }
  },

  // Refresh JWT token
  refreshToken: async (): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>("/refresh-token");

    // Save new tokens
    saveTokens(
      response.data.token,
      response.data.csrfToken,
      response.data.expiresIn
    );

    return response.data;
  },

  // Refresh CSRF token only
  refreshCsrfToken: async (): Promise<string> => {
    const response = await api.post<{ csrfToken: string }>("/refresh-csrf");
    const newCsrfToken = response.data.csrfToken;

    // Update stored CSRF token
    localStorage.setItem(CSRF_KEY, newCsrfToken);

    return newCsrfToken;
  },

  // Check if user is authenticated (client-side check)
  isAuthenticated: (): boolean => {
    return getToken() !== null;
  },

  // Get current tokens (for debugging)
  getCurrentTokens: () => {
    return {
      jwt: getToken(),
      csrf: getCsrfToken(),
      expiry: localStorage.getItem(TOKEN_EXPIRY_KEY),
    };
  },

  // Example protected API call
  callProtectedEndpoint: async (data: any): Promise<any> => {
    const response = await api.post("/api/protected", data);
    return response.data;
  },
};
