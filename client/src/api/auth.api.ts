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
    const response = await apiClient.post('/auth/login', { email, password });
    const data = (response.data as any)?.data || response.data;
    return data;
  },

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    if (IS_DEMO_MODE) {
      return {
        token: 'demo-jwt-token-12345',
        user: { id: 'demo-user-1', email, name },
      };
    }
    const response = await apiClient.post('/auth/register', { name, email, password });
    const data = (response.data as any)?.data || response.data;
    return data;
  },

  async getMe(): Promise<{ user: User }> {
    if (IS_DEMO_MODE) {
      return { user: { id: 'demo-user-1', email: 'demo@stockai.com', name: 'Yash R.' } };
    }
    const response = await apiClient.get('/auth/me');
    const data = (response.data as any)?.data || response.data;
    return typeof data.user === 'object' ? data : { user: data };
  },
};
