import { buildChoice, slotOptions } from './options.js';

const pick = (list) => list[Math.floor(Math.random() * list.length)];

/**
 * Dificuldade fácil: uma jogada válida qualquer, sem estratégia nenhuma.
 * Também é o plano B dos decisores com IA quando eles falham.
 */
export const randomOpponent = {
  choose(request) {
    if (request.teamPreview) {
      const order = request.side.pokemon.map((_, i) => i + 1).sort(() => Math.random() - 0.5);
      return `team ${order.slice(0, request.maxChosenTeamSize ?? 4).join('')}`;
    }

    // Escolhe posição por posição, tirando do sorteio o que conflitaria com a
    // escolha anterior (segunda mega, troca pro mesmo reserva).
    const chosen = [];
    for (const options of slotOptions(request)) {
      const allowed = options.filter(
        (option) => !(option.mega && chosen.some((c) => c?.mega)) && !(option.switchTo && chosen.some((c) => c?.switchTo === option.switchTo)),
      );
      chosen.push(allowed.length ? pick(allowed) : null);
    }
    return buildChoice(chosen);
  },
};
