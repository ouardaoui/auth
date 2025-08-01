import axios, { AxiosResponse } from "axios";
import { LoginResponse, MeResponse, LogoutResponse } from "./types";

// Configure axios to include cookies
axios.defaults.withCredentials = true;

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Store CSRF token globally
let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

// Extended interfaces to include CSRF token
interface LoginResponseWithToken extends LoginResponse {
  csrfToken?: string;
}

interface MeResponseWithToken extends MeResponse {
  csrfToken?: string;
}

// Function to get CSRF token
const getCsrfToken = async (): Promise<string> => {
  try {
    const response: AxiosResponse<{ csrfToken: string }> = await api.get(
      "/csrf-token"
    );
    csrfToken = response.data.csrfToken;
    csrfTokenPromise = null;
    return csrfToken;
  } catch (error) {
    csrfTokenPromise = null;
    console.error("Failed to get CSRF token:", error);
    throw error;
  }
};

// Ensure CSRF token is available
const ensureCSRFToken = async (): Promise<string> => {
  if (csrfToken) return csrfToken;

  if (!csrfTokenPromise) {
    csrfTokenPromise = getCsrfToken();
  }

  return csrfTokenPromise;
};

// Intercept requests to add CSRF token
api.interceptors.request.use(
  async (config) => {
    // Add CSRF token to POST, PUT, PATCH, DELETE requests
    if (
      ["post", "put", "patch", "delete"].includes(
        config.method?.toLowerCase() || ""
      )
    ) {
      // Skip CSRF for login endpoint
      if (config.url !== "/login") {
        try {
          const token = await ensureCSRFToken();
          config.headers["X-CSRF-Token"] = token;
        } catch (error) {
          // If we can't get a CSRF token, let the request proceed
          // It will likely fail with 403, which we handle in response interceptor
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercept responses to handle CSRF errors and update tokens
api.interceptors.response.use(
  (response) => {
    // Update CSRF token if included in response
    if (response.data?.csrfToken) {
      csrfToken = response.data.csrfToken;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle token expiration
    if (
      error.response?.status === 401 &&
      error.response?.data?.error === "Token expired" &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      // Try to refresh the token
      try {
        await authAPI.refreshToken();
        return api.request(originalRequest);
      } catch (refreshError) {
        // Refresh failed, user needs to login again
        csrfToken = null;
        window.location.href = "/login"; // Or handle via your app's routing
        return Promise.reject(error);
      }
    }

    // Handle invalid CSRF token
    if (
      error.response?.status === 403 &&
      (error.response?.data?.error === "Invalid CSRF token" ||
        error.response?.data?.code === "EBADCSRFTOKEN") &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        // Force refresh CSRF token
        csrfToken = null;
        await getCsrfToken();

        // Retry the original request with new token
        originalRequest.headers["X-CSRF-Token"] = csrfToken;
        return api.request(originalRequest);
      } catch (refreshError) {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  // Login user (no CSRF needed for login)
  login: async (username: string): Promise<LoginResponse> => {
    const response: AxiosResponse<LoginResponseWithToken> = await api.post(
      "/login",
      { username }
    );

    // Store CSRF token from login response
    if (response.data.csrfToken) {
      csrfToken = response.data.csrfToken;
    }

    return response.data;
  },

  // Check authentication status
  me: async (): Promise<MeResponse> => {
    const response: AxiosResponse<MeResponseWithToken> = await api.get("/me");

    // Update CSRF token if provided
    if (response.data.csrfToken) {
      csrfToken = response.data.csrfToken;
    }

    return response.data;
  },

  // Logout user
  logout: async (): Promise<LogoutResponse> => {
    const response = await api.post("/logout");

    // Clear stored CSRF token after logout
    csrfToken = null;

    return response.data;
  },

  // Refresh JWT and CSRF tokens
  refreshToken: async (): Promise<{ message: string; csrfToken: string }> => {
    const response = await api.post("/refresh-token");

    if (response.data.csrfToken) {
      csrfToken = response.data.csrfToken;
    }

    return response.data;
  },

  // Refresh only CSRF token
  refreshCsrfToken: async (): Promise<string> => {
    csrfToken = null; // Force new token
    return getCsrfToken();
  },

  // Get current CSRF token (useful for debugging)
  getCurrentCsrfToken: (): string | null => {
    return csrfToken;
  },

  // Example protected API call
  callProtectedEndpoint: async (data: any): Promise<any> => {
    const response = await api.post("/api/protected", data);
    return response.data;
  },
};
