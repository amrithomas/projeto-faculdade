// Subconjunto do "request" do Pokémon Showdown que a tela usa
// (ver sim/side.ts no pacote pokemon-showdown).

export interface BattleMove {
  move: string;
  id: string;
  pp: number;
  maxpp: number;
  // normal, any, adjacentFoe, adjacentAlly, allAdjacentFoes, self...
  target: string;
  disabled?: boolean | string;
}

export interface ActiveRequest {
  moves: BattleMove[];
  trapped?: boolean;
  canMegaEvo?: boolean;
}

export interface SidePokemon {
  ident: string;
  details: string;
  condition: string;
  active: boolean;
  moves: string[];
  item: string;
  ability: string;
}

export interface BattleRequest {
  teamPreview?: boolean;
  maxChosenTeamSize?: number;
  wait?: boolean;
  forceSwitch?: boolean[];
  active?: ActiveRequest[];
  side: { pokemon: SidePokemon[] };
}

export interface BattleState {
  id: string;
  ended: boolean;
  winner: string | null;
  // Protocolo do Showdown, já sem as informações secretas do oponente.
  log: string[];
  request: BattleRequest | null;
  // Nome da espécie → id de sprite do Showdown.
  sprites: Record<string, string>;
  // Nome da espécie → imagem do nosso banco, reserva quando o Showdown não tem.
  artwork: Record<string, string>;
}
