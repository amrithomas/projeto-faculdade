import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../types/auth';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setSession: (user: AuthUser, token: string) => void;
  clearSession: () => void;
}

// Guarda usuário + token no localStorage (via middleware "persist") pra
// manter a sessão entre recarregamentos de página. Nenhum dado sensível
// além do próprio token de acesso é armazenado.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setSession: (user, token) => set({ user, token, isAuthenticated: true }),
      clearSession: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: 'pokedex-auth' },
  ),
);
