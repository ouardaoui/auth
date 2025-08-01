// User interface
export interface LoginResponse {
  message: string;
  username: string;
  token: string;
  csrfToken: string;
  expiresIn: number;
}

export interface MeResponse {
  loggedIn: boolean;
  username?: string;
  csrfToken?: string;
}

export interface LogoutResponse {
  message: string;
}

export interface TokenResponse {
  message: string;
  token: string;
  csrfToken: string;
  expiresIn: number;
}
