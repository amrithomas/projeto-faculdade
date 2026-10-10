import Anthropic from '@anthropic-ai/sdk';
import { buildChoice, slotOptions } from './options.js';
import { buildPreview, buildView } from './view.js';
import { PREVIEW_INSTRUCTIONS, SYSTEM_PROMPT } from './prompt.js';

// Lê ANTHROPIC_API_KEY do ambiente (docker-compose → .env da raiz). Criado só
// no primeiro uso, pra o serviço subir mesmo sem chave (fácil não precisa).
let client;
const anthropic = () => (client ??= new Anthropic());

// Respostas só com os números: cada token de saída custa 5x um de entrada.
const TURN_SCHEMA = {
  type: 'object',
  properties: { slot1: { type: 'integer' }, slot2: { type: 'integer' } },
  required: ['slot1', 'slot2'],
  additionalProperties: false,
};

const PREVIEW_SCHEMA = {
  type: 'object',
  properties: { ordem: { type: 'array', items: { type: 'integer' } } },
  required: ['ordem'],
  additionalProperties: false,
};

/**
 * Oponente controlado pelo Claude. Qualquer problema (erro da API, demora,
 * recusa, resposta fora da lista) vira exceção, e o Match cai no plano B.
 */
export function claudeOpponent(profile) {
  const usage = { calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

  async function ask(content, schema) {
    const params = {
      model: profile.model,
      max_tokens: 4096,
      ...(!profile.thinking && { thinking: { type: 'disabled' } }),
      system: [{ type: 'text', text: SYSTEM_PROMPT[profile.id], cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: JSON.stringify(content) }],
      output_config: { effort: profile.effort, format: { type: 'json_schema', schema } },
    };
    const options = { timeout: profile.timeoutMs, maxRetries: 1 };
    const response = profile.serverFallback
      // Se o modelo recusar, a própria API tenta outro modelo na mesma chamada.
      ? await anthropic().beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }, options)
      : await anthropic().messages.create(params, options);

    usage.calls++;
    usage.input += response.usage.input_tokens;
    usage.output += response.usage.output_tokens;
    usage.cacheRead += response.usage.cache_read_input_tokens ?? 0;
    usage.cacheWrite += response.usage.cache_creation_input_tokens ?? 0;

    if (response.stop_reason !== 'end_turn') throw new Error(`resposta interrompida: ${response.stop_reason}`);
    const text = response.content.find((block) => block.type === 'text')?.text;
    return JSON.parse(text);
  }

  return {
    usage,

    async choose(request, battle) {
      if (request.teamPreview) {
        const size = request.maxChosenTeamSize ?? 4;
        const { ordem } = await ask({ instrucao: PREVIEW_INSTRUCTIONS, ...buildPreview(battle, request) }, PREVIEW_SCHEMA);
        const valid = ordem.length === size && new Set(ordem).size === size
          && ordem.every((n) => Number.isInteger(n) && n >= 1 && n <= request.side.pokemon.length);
        if (!valid) throw new Error(`ordem inválida na prévia: ${JSON.stringify(ordem)}`);
        return `team ${ordem.join('')}`;
      }

      const options = slotOptions(request);
      // Nada a decidir (ex: troca forçada com um único reserva): não chama a API.
      if (options.every((list) => list.length <= 1)) return buildChoice(options.map((list) => list[0] ?? null));

      // Alvo pelo nome em vez do número do Showdown ("alvo 1" → "Rillaboom (adversário)").
      const targetName = (target) => {
        const pokemon = target > 0 ? battle.p1.active[target - 1] : battle.p2.active[-target - 1];
        return `${pokemon?.species.name ?? 'vazio'} (${target > 0 ? 'adversário' : 'seu aliado'})`;
      };
      const describe = (option) => {
        if (!option.move) return option.label; // troca
        const target = option.target == null ? '' : ` → ${targetName(option.target)}`;
        return `${option.move}${target}${option.mega ? ' + Mega' : ''}`;
      };
      const numbered = Object.fromEntries(
        options.map((list, i) => [`slot${i + 1}`, list.map((option, n) => `${n + 1}. ${describe(option)}`)]),
      );
      const answer = await ask({ estado: buildView(battle, request), opcoes: numbered }, TURN_SCHEMA);

      const chosen = options.map((list, i) => {
        const pick = answer[`slot${i + 1}`];
        if (list.length === 0) return null;
        if (Number.isInteger(pick) && pick >= 1 && pick <= list.length) return list[pick - 1];
        // Plano B só pra esse pokémon; o outro mantém a jogada do Claude.
        console.warn(`slot${i + 1}: opção ${pick} fora da lista (1-${list.length}), sorteando`);
        return null;
      });
      // Sorteia o que ficou sem jogada válida, sem conflitar com a outra posição.
      chosen.forEach((option, i) => {
        if (option || options[i].length === 0) return;
        const allowed = options[i].filter((o) => !(o.mega && chosen.some((c) => c?.mega)) && !(o.switchTo && chosen.some((c) => c?.switchTo === o.switchTo)));
        chosen[i] = allowed[Math.floor(Math.random() * allowed.length)] ?? null;
      });
      return buildChoice(chosen); // lança se for duas megas ou troca repetida
    },
  };
}
