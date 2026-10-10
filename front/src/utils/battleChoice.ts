import type { BattleRequest } from '../types/battle';

// O que o jogador escolheu pra um dos seus 2 pokémons em campo.
export type Action =
  | { kind: 'move'; move: number; target?: number; mega?: boolean }
  | { kind: 'switch'; slot: number }
  | { kind: 'pass' };

export interface TargetOption {
  // Número de alvo do Showdown em duplas: 1/2 = oponentes, -1/-2 = seu lado.
  value: number;
  side: 'foe' | 'ally' | 'self';
  slot: 0 | 1;
}

/**
 * Alvos possíveis de um golpe usado pelo pokémon na posição `active` (0 ou 1).
 * Vazio quando o golpe não deixa escolher (acerta todos, o próprio usuário...).
 */
export function targetsFor(moveTarget: string, active: number): TargetOption[] {
  const ally = (1 - active) as 0 | 1;
  const foes: TargetOption[] = [
    { value: 1, side: 'foe', slot: 0 },
    { value: 2, side: 'foe', slot: 1 },
  ];
  const allyOption: TargetOption = { value: -(ally + 1), side: 'ally', slot: ally };
  const selfOption: TargetOption = { value: -(active + 1), side: 'self', slot: active as 0 | 1 };

  switch (moveTarget) {
    case 'normal':
    case 'any':
      return [...foes, allyOption];
    case 'adjacentFoe':
      return foes;
    case 'adjacentAlly':
      return [allyOption];
    case 'adjacentAllyOrSelf':
      return [selfOption, allyOption];
    default:
      return [];
  }
}

/**
 * Quais posições precisam de decisão neste pedido. As outras vão como "pass"
 * (pokémon desmaiado sem reserva, ou que não precisa trocar numa troca forçada).
 */
export function slotsToDecide(request: BattleRequest): boolean[] {
  if (request.forceSwitch) return request.forceSwitch;
  return (request.active ?? []).map((_, i) => !request.side.pokemon[i].condition.endsWith(' fnt'));
}

// Reservas (posição 1-based no time) pra onde dá pra trocar.
export function switchOptions(request: BattleRequest): number[] {
  return request.side.pokemon
    .map((pokemon, i) => ({ pokemon, slot: i + 1 }))
    .filter(({ pokemon }) => !pokemon.active && !pokemon.condition.endsWith(' fnt'))
    .map(({ slot }) => slot);
}

export function buildChoice(actions: Action[]): string {
  return actions
    .map((action) => {
      if (action.kind === 'switch') return `switch ${action.slot}`;
      if (action.kind === 'pass') return 'pass';
      return ['move', action.move, action.target, action.mega && 'mega'].filter(Boolean).join(' ');
    })
    .join(', ');
}
