import type { PokemonStat } from './pokemon';

export type StatName = 'hp' | 'attack' | 'defense' | 'special-attack' | 'special-defense' | 'speed';

export type StatPoints = Record<StatName, number>;

export interface Nature {
  increased: StatName | null;
  decreased: StatName | null;
}

// Espelha config/vgc.php do back (GET /api/vgc/rules).
export interface VgcRules {
  regulation: string;
  level: number;
  team_size: number;
  battle_size: number;
  max_moves: number;
  iv: number;
  stat_points: { total: number; per_stat: number };
  max_restricted: number;
  allow_mythical: boolean;
  restricted: number[];
  banned: number[];
  natures: Record<string, Nature>;
  // Nome da mega => nome da pedra que ela obrigatoriamente segura.
  mega_stones: Record<string, string>;
  stats: StatName[];
  // Tipo defensor => tipos atacantes que causam x2 / x0.5 / x0 nele.
  type_chart: Record<
    string,
    { double_damage_from: string[]; half_damage_from: string[]; no_damage_from: string[] }
  >;
}

export interface Item {
  id: number;
  name: string;
  category: string;
  sprite_url: string | null;
  description: string | null;
}

export interface LearnsetAbility {
  id: number;
  name: string;
  description: string | null;
  is_hidden: boolean;
}

export interface LearnsetMove {
  id: number;
  name: string;
  type: string | null;
  damage_class: 'physical' | 'special' | 'status' | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  description: string | null;
  learn_method: string;
}

export interface Learnset {
  abilities: LearnsetAbility[];
  moves: LearnsetMove[];
}

export interface TeamPokemon {
  id: number;
  pokedex_number: number;
  name: string;
  types: string[];
  sprite_url: string | null;
  stats: PokemonStat[];
}

export interface TeamMember {
  id: number;
  slot: number;
  pokemon: TeamPokemon;
  ability: { id: number; name: string; description: string | null } | null;
  item: Item | null;
  nature: string;
  stat_points: StatPoints;
  moves: Omit<LearnsetMove, 'description' | 'learn_method'>[];
}

export interface Team {
  id: number;
  name: string;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
  members: TeamMember[];
}

// Formato enviado no POST/PUT /api/teams.
export interface TeamPayload {
  name: string;
  members: {
    pokemon_id: number;
    ability_id: number | null;
    item_id: number | null;
    nature: string;
    stat_points: StatPoints;
    move_ids: number[];
  }[];
}
