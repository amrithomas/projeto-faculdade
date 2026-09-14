import { api } from './client';
import type { AuthResponse } from '../types/auth';

export async function registerUser(username: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', { username, password });
  return data;
}

export async function loginUser(username: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', { username, password });
  return data;
}

export async function logoutUser(): Promise<void> {
  await api.post('/auth/logout');
}
