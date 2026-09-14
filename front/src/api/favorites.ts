import { api } from './client';
import type { PaginatedPokemons } from '../types/pokemon';

export async function fetchFavorites(page = 1, perPage = 48): Promise<PaginatedPokemons> {
  const { data } = await api.get<PaginatedPokemons>('/favorites', {
    params: { page, per_page: perPage },
  });
  return data;
}

export async function toggleFavorite(pokemonId: number): Promise<boolean> {
  const { data } = await api.post<{ is_favorited: boolean }>(`/pokemons/${pokemonId}/favorite`);
  return data.is_favorited;
}
