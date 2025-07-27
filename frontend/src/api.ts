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

// Extended interfaces to include CSRF token
interface LoginResponseWithToken extends LoginResponse {
  csrfToken?: string;
}

interface MeResponseWithToken extends MeResponse {
  csrfToken?: string;
}

// Intercept requests to add CSRF token
api.interceptors.request.use(
  (config) => {
    // Add CSRF token to POST, PUT, PATCH, DELETE requests
    if (
      ["post", "put", "patch", "delete"].includes(
        config.method?.toLowerCase() || ""
      )
    ) {
      if (csrfToken) {
        config.headers["X-CSRF-Token"] = csrfToken;
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
    // If CSRF token is invalid, try to refresh it and retry
    if (
      error.response?.status === 403 &&
      (error.response?.data?.error === "Invalid CSRF token" ||
        error.response?.data?.code === "EBADCSRFTOKEN")
    ) {
      try {
        await getCsrfToken(); // Refresh token
        // Retry the original request
        const originalRequest = error.config;
        if (!originalRequest._retry) {
          originalRequest._retry = true;
          originalRequest.headers["X-CSRF-Token"] = csrfToken;
          return api.request(originalRequest);
        }
      } catch (refreshError) {
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

// Function to get CSRF token
export const getCsrfToken = async (): Promise<string> => {
  try {
    const response: AxiosResponse<{ csrfToken: string }> = await api.get(
      "/csrf-token"
    );
    csrfToken = response.data.csrfToken;
    return csrfToken;
  } catch (error) {
    console.error("Failed to get CSRF token:", error);
    throw error;
  }
};

export const authAPI = {
  // Initialize CSRF token
  initCsrf: async (): Promise<void> => {
    if (!csrfToken) {
      await getCsrfToken();
    }
  },

  // Login user
  login: async (username: string): Promise<LoginResponse> => {
    // Ensure we have a CSRF token before making the request
    if (!csrfToken) {
      await getCsrfToken();
    }
    const response: AxiosResponse<LoginResponseWithToken> = await api.post(
      "/login",
      { username }
    );
    // Update CSRF token if provided in response
    if (response.data.csrfToken) {
      csrfToken = response.data.csrfToken;
    }
    return response.data;
  },

  // Check authentication status
  me: async (): Promise<MeResponse> => {
    const response: AxiosResponse<MeResponseWithToken> = await api.get("/me");
    // Update CSRF token if provided in response
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

  // Refresh CSRF token
  refreshCsrfToken: async (): Promise<string> => {
    try {
      const response: AxiosResponse<{ csrfToken: string }> = await api.post(
        "/refresh-csrf"
      );
      csrfToken = response.data.csrfToken;
      return csrfToken;
    } catch (error) {
      console.error("Failed to refresh CSRF token:", error);
      throw error;
    }
  },

  // Get current CSRF token (useful for debugging)
  getCurrentCsrfToken: (): string | null => {
    return csrfToken;
  },
};
