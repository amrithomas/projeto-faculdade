import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// Em dev, o Vite injeta VITE_API_URL a partir do arquivo .env (ver .env.example).
// Dentro do docker-compose, o front conversa com o back pela URL pública exposta pelo nginx.
const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

export const api = axios.create({
  baseURL,
  headers: {
    Accept: 'application/json',
  },
});

// Anexa o token de acesso (guardado no store zustand) em todo request, se
// o usuário estiver logado.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Se o back disser que o token não é mais válido (expirado/revogado), limpa
// a sessão local pra voltar ao estado "deslogado" em vez de ficar num
// limbo mandando um token morto pra sempre.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearSession();
    }
    return Promise.reject(error);
  },
);
