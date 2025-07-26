// User interface
export interface User {
  username: string;
  loggedIn: boolean;
}

// API response types
export interface LoginResponse {
  message: string;
  username: string;
}

export interface MeResponse {
  loggedIn: boolean;
  username?: string;
}

export interface LogoutResponse {
  message: string;
}
