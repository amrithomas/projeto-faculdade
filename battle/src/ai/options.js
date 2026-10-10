/**
 * Jogadas válidas de cada pokémon em campo, a partir do pedido do simulador
 * (o mesmo "request" que a tela recebe). Os decisores (aleatório, Claude)
 * só escolhem um item de cada lista; nunca escrevem a escolha do Showdown.
 *
 * Cada opção: { label, choice, mega?, switchTo? }
 *   choice   → trecho no formato do Showdown ("move 2 1", "switch 3", "pass")
 *   mega     → usa a mega evolução (só uma por batalha)
 *   switchTo → reserva pra onde troca (dois pokémons não trocam pro mesmo)
 */

// Alvos em duplas, na numeração do Showdown: 1/2 = oponentes, -1/-2 = o próprio lado.
function targetsFor(moveTarget, slot) {
  const ally = -(2 - slot); // slot 0 → -2, slot 1 → -1
  const self = -(slot + 1);
  switch (moveTarget) {
    case 'normal':
    case 'any':
      return [1, 2, ally];
    case 'adjacentFoe':
      return [1, 2];
    case 'adjacentAlly':
      return [ally];
    case 'adjacentAllyOrSelf':
      return [self, ally];
    default:
      return [null]; // golpe sem escolha de alvo (acerta todos, o próprio usuário...)
  }
}

const isFainted = (pokemon) => pokemon.condition.endsWith(' fnt');
const speciesOf = (pokemon) => pokemon.details.split(',')[0];

function switchOptions(request) {
  return request.side.pokemon
    .map((pokemon, i) => ({ pokemon, slot: i + 1 }))
    .filter(({ pokemon }) => !pokemon.active && !isFainted(pokemon))
    .map(({ pokemon, slot }) => ({ label: `Trocar por ${speciesOf(pokemon)}`, choice: `switch ${slot}`, switchTo: slot }));
}

/**
 * Lista de opções por posição em campo (array de 2 em duplas).
 * Lista vazia = essa posição só pode passar a vez.
 */
export function slotOptions(request) {
  if (request.forceSwitch) {
    return request.forceSwitch.map((mustSwitch) => (mustSwitch ? switchOptions(request) : []));
  }

  return (request.active ?? []).map((active, slot) => {
    const pokemon = request.side.pokemon[slot];
    if (!pokemon || isFainted(pokemon) || pokemon.commanding) return [];

    const options = [];
    active.moves.forEach((move, i) => {
      if (move.disabled || move.pp === 0) return;
      for (const target of targetsFor(move.target, slot)) {
        const choice = target === null ? `move ${i + 1}` : `move ${i + 1} ${target}`;
        const label = target === null ? move.move : `${move.move} → alvo ${target}`;
        options.push({ label, choice, move: move.move, target });
        if (active.canMegaEvo) options.push({ label: `${label} + Mega`, choice: `${choice} mega`, move: move.move, target, mega: true });
      }
    });
    if (!active.trapped) options.push(...switchOptions(request));
    return options;
  });
}

/**
 * Junta a opção escolhida de cada posição na escolha do Showdown. Posição sem
 * opções vira "pass". Lança erro se a combinação for impossível (duas megas,
 * dois pokémons trocando pro mesmo reserva) — o Match cai no plano B.
 */
export function buildChoice(perSlot) {
  const megas = perSlot.filter((option) => option?.mega).length;
  const switches = perSlot.map((option) => option?.switchTo).filter(Boolean);
  if (megas > 1) throw new Error('Só uma mega evolução por batalha.');
  if (new Set(switches).size !== switches.length) throw new Error('Dois pokémons trocando pro mesmo reserva.');

  return perSlot.map((option) => option?.choice ?? 'pass').join(', ');
}
