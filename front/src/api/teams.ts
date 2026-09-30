import { api } from './client';
import type { Item, Learnset, Team, TeamPayload, VgcRules } from '../types/team';

export async function fetchTeams(): Promise<Team[]> {
  const { data } = await api.get<{ data: Team[] }>('/teams');
  return data.data;
}

export async function fetchTeam(id: number | string): Promise<Team> {
  const { data } = await api.get<{ data: Team }>(`/teams/${id}`);
  return data.data;
}

export async function createTeam(payload: TeamPayload): Promise<Team> {
  const { data } = await api.post<{ data: Team }>('/teams', payload);
  return data.data;
}

export async function updateTeam(id: number, payload: TeamPayload): Promise<Team> {
  const { data } = await api.put<{ data: Team }>(`/teams/${id}`, payload);
  return data.data;
}

export async function deleteTeam(id: number): Promise<void> {
  await api.delete(`/teams/${id}`);
}

// Regras, itens e learnsets praticamente não mudam enquanto a página está
// aberta, então ficam em cache aqui (guardando a Promise, pra que vários
// componentes pedindo ao mesmo tempo gerem um request só).
let rulesPromise: Promise<VgcRules> | null = null;
let itemsPromise: Promise<Item[]> | null = null;
const learnsetCache = new Map<number, Promise<Learnset>>();

export function fetchVgcRules(): Promise<VgcRules> {
  rulesPromise ??= api
    .get<{ data: VgcRules }>('/vgc/rules')
    .then(({ data }) => data.data)
    .catch((err) => {
      rulesPromise = null;
      throw err;
    });
  return rulesPromise;
}

export function fetchItems(): Promise<Item[]> {
  itemsPromise ??= api
    .get<{ data: Item[] }>('/items')
    .then(({ data }) => data.data)
    .catch((err) => {
      itemsPromise = null;
      throw err;
    });
  return itemsPromise;
}

export function fetchLearnset(pokemonId: number): Promise<Learnset> {
  let promise = learnsetCache.get(pokemonId);
  if (!promise) {
    promise = api
      .get<{ data: Learnset }>(`/pokemons/${pokemonId}/learnset`)
      .then(({ data }) => data.data)
      .catch((err) => {
        learnsetCache.delete(pokemonId);
        throw err;
      });
    learnsetCache.set(pokemonId, promise);
  }
  return promise;
}
