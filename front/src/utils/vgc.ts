import type { PokemonSummary } from '../types/pokemon';
import type { Nature, StatName, StatPoints, VgcRules } from '../types/team';

export const STAT_SHORT_LABELS: Record<StatName, string> = {
  hp: 'PS',
  attack: 'Atq',
  defense: 'Def',
  'special-attack': 'Atq Esp',
  'special-defense': 'Def Esp',
  speed: 'Vel',
};

export function formatName(name: string): string {
  return name.replace(/-/g, ' ');
}

export function emptyStatPoints(): StatPoints {
  return {
    hp: 0,
    attack: 0,
    defense: 0,
    'special-attack': 0,
    'special-defense': 0,
    speed: 0,
  };
}

export function totalStatPoints(points: StatPoints): number {
  return Object.values(points).reduce((sum, value) => sum + value, 0);
}

/**
 * Stat final no formato do Pokémon Champions: IV fixo (31), nível 50 e
 * cada stat point soma +1 direto no valor antes da natureza.
 *
 *   PS:    floor((2*base + IV) * nv / 100) + nv + 10 + SP
 *   Outros: floor((floor((2*base + IV) * nv / 100) + 5 + SP) * natureza)
 */
export function calcStat(
  stat: StatName,
  base: number,
  statPoints: number,
  nature: Nature | undefined,
  rules: Pick<VgcRules, 'level' | 'iv'>,
): number {
  const core = Math.floor(((2 * base + rules.iv) * rules.level) / 100);

  if (stat === 'hp') {
    // Shedinja sempre tem 1 de PS.
    if (base === 1) return 1;
    return core + rules.level + 10 + statPoints;
  }

  // Conta em inteiros (x110/100) pra fugir de erro de ponto flutuante no floor.
  let multiplier = 100;
  if (nature?.increased === stat) multiplier = 110;
  if (nature?.decreased === stat) multiplier = 90;

  return Math.floor(((core + 5 + statPoints) * multiplier) / 100);
}

export function natureLabel(name: string, nature: Nature): string {
  if (!nature.increased || !nature.decreased) {
    return `${name} (neutra)`;
  }
  return `${name} (+${STAT_SHORT_LABELS[nature.increased]} −${STAT_SHORT_LABELS[nature.decreased]})`;
}

/**
 * Motivo pelo qual o pokémon não pode entrar no time segundo a
 * regulation (ou null se pode). Espelha VgcTeamValidator::checkLegendaries
 * do back, pra avisar antes de tentar salvar.
 */
export function banReason(
  pokemon: Pick<PokemonSummary, 'pokedex_number' | 'is_mythical'>,
  rules: VgcRules,
  restrictedAlreadyInTeam: number,
): string | null {
  if (rules.banned.includes(pokemon.pokedex_number)) {
    return 'Banido';
  }
  if (rules.restricted.includes(pokemon.pokedex_number)) {
    if (rules.max_restricted === 0) return 'Restrito (proibido)';
    if (restrictedAlreadyInTeam >= rules.max_restricted) return 'Limite de restritos atingido';
    return null;
  }
  if (pokemon.is_mythical && !rules.allow_mythical) {
    return 'Mítico (proibido)';
  }
  return null;
}
