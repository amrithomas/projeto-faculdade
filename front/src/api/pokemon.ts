import { api } from './client';
import type { PaginatedPokemons, PokemonDetail, Region } from '../types/pokemon';

export interface PokemonListParams {
  search?: string;
  type?: string;
  region?: string;
  generation?: number;
  per_page?: number;
  page?: number;
}

export async function fetchPokemons(params: PokemonListParams): Promise<PaginatedPokemons> {
  const { data } = await api.get<PaginatedPokemons>('/pokemons', { params });
  return data;
}

export async function fetchPokemon(id: number | string): Promise<PokemonDetail> {
  const { data } = await api.get<{ data: PokemonDetail }>(`/pokemons/${id}`);
  return data.data;
}

export async function fetchTypes(): Promise<string[]> {
  const { data } = await api.get<{ data: string[] }>('/types');
  return data.data;
}

export async function fetchRegions(): Promise<Region[]> {
  const { data } = await api.get<{ data: Region[] }>('/regions');
  return data.data;
}
