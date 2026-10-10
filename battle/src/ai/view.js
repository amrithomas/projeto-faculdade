import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { extractChannelMessages } = require('pokemon-showdown/dist/sim/battle');

/**
 * O que a IA (lado p2) sabe neste momento, no formato que vai pro Claude.
 * Mesma regra da tela do jogador: o próprio lado completo; do adversário só o
 * que é público (espécie, tipos, HP em %, status, boosts) ou já foi revelado
 * no log (golpes usados, item, habilidade).
 */
export function buildView(battle, request) {
  const log = extractChannelMessages(battle.log.join('\n'), [2])[2];

  return compact({
    turno: battle.turn,
    campo: fieldView(battle),
    seu_lado: ownSide(battle, request),
    adversario: opponentSide(battle, log),
    ultimo_turno: lastTurn(log),
  });
}

const nonZero = (boosts) => Object.fromEntries(Object.entries(boosts).filter(([, v]) => v !== 0));

// Efeitos internos do simulador que não ajudam a decidir (contador do Protect...).
const INTERNAL = new Set(['stall', 'choicelock']);
const effects = (pokemon) => Object.keys(pokemon.volatiles).filter((v) => !INTERNAL.has(v));

// Tira null, false, {} e [] — cada campo vazio é token pago à toa em todo turno.
function compact(value) {
  if (Array.isArray(value)) return value.map(compact);
  if (value === null || typeof value !== 'object') return value;
  const entries = Object.entries(value)
    .map(([key, v]) => [key, compact(v)])
    .filter(([, v]) => v !== null && v !== false && !(typeof v === 'object' && Object.keys(v).length === 0));
  return Object.fromEntries(entries);
}

function fieldView(battle) {
  const { field } = battle;
  return {
    clima: field.weather || null,
    terreno: field.terrain || null,
    efeitos: Object.keys(field.pseudoWeather), // trickroom, gravity...
    seu_lado: Object.keys(battle.p2.sideConditions), // tailwind, reflect...
    lado_adversario: Object.keys(battle.p1.sideConditions),
  };
}

function ownSide(battle, request) {
  return request.side.pokemon.map((pokemon, i) => {
    const active = pokemon.active ? battle.p2.active[i] : null;
    // Desmaiado só ocupa espaço: basta dizer que caiu.
    if (pokemon.condition.endsWith(' fnt')) return { pokemon: pokemon.details.split(',')[0], hp: 0 };
    return {
      pokemon: pokemon.details.split(',')[0],
      em_campo: pokemon.active ? `slot${i + 1}` : false,
      hp: pokemon.condition,
      item: pokemon.item || null,
      habilidade: pokemon.ability || pokemon.baseAbility,
      // Só a Velocidade: os outros atributos o modelo deduz da espécie.
      vel: pokemon.stats.spe,
      golpes: pokemon.moves,
      ...(active && { boosts: nonZero(active.boosts), efeitos: effects(active) }),
    };
  });
}

function opponentSide(battle, log) {
  // Informações reveladas no log, por nome do pokémon.
  const revealed = {};
  const note = (ident, key, value) => {
    const name = ident.slice(ident.indexOf(':') + 2);
    revealed[name] ??= { golpes: new Set() };
    if (key === 'golpes') revealed[name].golpes.add(value);
    else revealed[name][key] = value;
  };
  for (const line of log) {
    const [, type, who = '', what = '', ...rest] = line.split('|');
    if (!who.startsWith('p1')) continue;
    if (type === 'move') note(who, 'golpes', what);
    if (type === '-item' || type === '-enditem') note(who, 'item', what);
    if (type === '-ability') note(who, 'habilidade', what);
    // Efeitos revelam habilidade/item: "[from] ability: Intimidate", "[from] item: Leftovers".
    const from = rest.find((part) => part.startsWith('[from] ability: ') || part.startsWith('[from] item: '));
    if (from?.startsWith('[from] ability: ')) note(who, 'habilidade', from.slice('[from] ability: '.length));
    if (from?.startsWith('[from] item: ')) note(who, 'item', from.slice('[from] item: '.length));
  }

  return battle.p1.pokemon
    // Só os que o jogador escolheu na prévia (os 4 que estão na batalha).
    .filter((pokemon) => pokemon.position < 4 || pokemon.isActive)
    .map((pokemon) => {
      const info = revealed[pokemon.name] ?? { golpes: new Set() };
      if (pokemon.fainted) return { pokemon: pokemon.species.name, hp_percentual: 0 };
      return {
        pokemon: pokemon.species.name,
        em_campo: pokemon.isActive ? `slot${pokemon.position + 1}` : false,
        hp_percentual: Math.round((pokemon.hp / pokemon.maxhp) * 100),
        status: pokemon.status || null,
        ...(pokemon.isActive && { boosts: nonZero(pokemon.boosts), efeitos: effects(pokemon) }),
        golpes_vistos: [...info.golpes],
        item_visto: info.item ?? null,
        habilidade_vista: info.habilidade ?? null,
      };
    });
}

// Linhas do turno anterior (protocolo do Showdown, que o modelo entende bem).
function lastTurn(log) {
  const turns = log.map((line, i) => (line.startsWith('|turn|') ? i : -1)).filter((i) => i >= 0);
  const start = turns.length >= 2 ? turns.at(-2) : 0;
  const end = turns.at(-1) ?? log.length;
  return log.slice(start, end).filter((line) => /^\|(move|-damage|-heal|faint|switch|-supereffective|-resisted|-immune|-crit|-miss|-status|-boost|-unboost|-weather|-fieldstart|-sidestart|-mega|cant)\|/.test(line));
}

/**
 * Prévia de time: os 6 de cada lado (do adversário só a espécie, como no jogo).
 */
export function buildPreview(battle, request) {
  return {
    seu_time: request.side.pokemon.map((pokemon, i) => ({
      numero: i + 1,
      pokemon: pokemon.details.split(',')[0],
      item: pokemon.item || undefined,
      golpes: pokemon.moves,
    })),
    time_adversario: battle.p1.pokemon.map((pokemon) => pokemon.species.name),
    escolher: request.maxChosenTeamSize ?? 4,
  };
}
