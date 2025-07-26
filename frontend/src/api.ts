import axios from 'axios';
import { LoginResponse, MeResponse, LogoutResponse } from './types';

// Configure axios to include cookies
axios.defaults.withCredentials = true;

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export const authAPI = {
  // Login user
  login: async (username: string): Promise<LoginResponse> => {
    const response = await api.post('/login', { username });
    return response.data;
  },

  // Check authentication status
  me: async (): Promise<MeResponse> => {
    const response = await api.get('/me');
    return response.data;
  },

  // Logout user
  logout: async (): Promise<LogoutResponse> => {
    const response = await api.post('/logout');
    return response.data;
  },
};
