import { apiClient, IS_DEMO_MODE } from './client';
import { AuthResponse, User } from '../types/api';

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    if (IS_DEMO_MODE) {
      return {
        token: 'demo-jwt-token-12345',
        user: { id: 'demo-user-1', email, name: 'Yash R.' },
      };
    }
    const response = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    return response.data;
  },

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    if (IS_DEMO_MODE) {
      return {
        token: 'demo-jwt-token-12345',
        user: { id: 'demo-user-1', email, name },
      };
    }
    const response = await apiClient.post<AuthResponse>('/auth/register', { name, email, password });
    return response.data;
  },

  async getMe(): Promise<{ user: User }> {
    if (IS_DEMO_MODE) {
      return { user: { id: 'demo-user-1', email: 'demo@stockai.com', name: 'Yash R.' } };
    }
    const response = await apiClient.get<{ user: User }>('/auth/me');
    return response.data;
  },
};
