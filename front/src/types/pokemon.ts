export interface PokemonStat {
  name: string;
  base_value: number;
}

export interface PokemonSummary {
  id: number;
  pokedex_number: number;
  generation: number | null;
  region: string | null;
  regional_dex_number: number | null;
  name: string;
  types: string[];
  sprite_url: string | null;
  height: number | null;
  weight: number | null;
  stats: PokemonStat[];
  is_favorited: boolean;
}

export interface EvolutionStagePokemon {
  id: number;
  pokedex_number: number;
  name: string;
  sprite_url: string | null;
  types: string[];
}

export interface Ability {
  name: string;
  description: string | null;
  is_hidden: boolean;
}

export interface PokemonMove {
  name: string;
  level: number | null;
  type: string | null;
  damage_class: 'physical' | 'special' | 'status' | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  description: string | null;
}

export interface TypeEffectiveness {
  weak_against: Record<string, number>;
  resistant_to: Record<string, number>;
  immune_to: string[];
}

export interface PokemonGender {
  male: boolean;
  female: boolean;
}

export interface PokemonDetail extends PokemonSummary {
  description: string | null;
  genus: string | null;
  gender: PokemonGender | null;
  type_effectiveness: TypeEffectiveness;
  abilities: Ability[];
  moves: PokemonMove[];
  // Linha evolutiva completa, agrupada por estágio (do básico até as
  // evoluções finais) — não só o elo anterior/seguinte a este pokémon.
  evolution_family: EvolutionStagePokemon[][];
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface PaginatedPokemons {
  data: PokemonSummary[];
  meta: PaginationMeta;
}

export interface Region {
  name: string;
  generation: number;
}
