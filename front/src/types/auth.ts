export interface AuthUser {
  id: number;
  username: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}
