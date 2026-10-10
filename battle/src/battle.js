import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { randomOpponent } from './ai/random.js';

// O pacote é CommonJS, e extractChannelMessages não sai pelo index dele.
const require = createRequire(import.meta.url);
const { Battle, Dex, toID } = require('pokemon-showdown');
const { extractChannelMessages } = require('pokemon-showdown/dist/sim/battle');

// Mecânicas do Pokémon Champions (Stat Points, megas, PP...) em duplas, com
// prévia de time e 4 escolhidos de 6. A validação do time (Species/Item Clause,
// restritos...) continua sendo a nossa (VgcTeamValidator no back), por isso o
// Custom Game e não o formato Reg M-B, que tem banlist própria.
export const FORMAT = 'gen9championsdoublescustomgame@@@Picked Team Size = 4';

const STAT_IDS = {
  hp: 'hp',
  attack: 'atk',
  defense: 'def',
  'special-attack': 'spa',
  'special-defense': 'spd',
  speed: 'spe',
};

/**
 * Time do Laravel (TeamResource) → sets do Showdown. A mega entra como forma
 * base segurando a pedra: no jogo ela mega evolui durante a batalha.
 */
export function toShowdownTeam(team) {
  return team.members.map((member) => {
    let species = findSpecies(member.pokemon.name);
    // O nome da PokeAPI marca a mega até quando a busca caiu na forma base
    // ("meowstic-male-mega" → Meowstic).
    const isMega = species.isMega || member.pokemon.name.includes('-mega');
    if (isMega) species = Dex.species.get(species.baseSpecies);

    return {
      name: species.name,
      species: species.name,
      item: member.item?.name ?? '',
      // A habilidade salva numa mega é a da mega (ex: Drought da Mega
      // Charizard Y). Antes de mega evoluir ela usa a da forma base, e o
      // simulador troca sozinho ao mega evoluir.
      // shortcut: sempre a 1ª habilidade da base (Blaze, não Solar Power); o montador
      // de times não deixa escolher a habilidade da forma base de uma mega.
      ability: isMega ? species.abilities['0'] : (member.ability?.name ?? ''),
      moves: member.moves.map((move) => move.name),
      nature: member.nature,
      gender: '',
      // No mod Champions o campo de EVs é o próprio Stat Point.
      evs: Object.fromEntries(Object.entries(member.stat_points).map(([stat, points]) => [STAT_IDS[stat], points])),
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      level: 50,
    };
  });
}

/**
 * A PokeAPI põe sufixo na forma padrão de algumas espécies ("basculegion-male",
 * "minior-red-meteor") que o Showdown não usa: tira um sufixo por vez até achar.
 */
function findSpecies(name) {
  for (let parts = name.split('-'); parts.length; parts.pop()) {
    const species = Dex.species.get(toID(parts.join('-')));
    if (species.exists) return species;
  }
  throw new Error(`Pokémon desconhecido pelo simulador: ${name}`);
}

/**
 * Nome da espécie no log ("Charizard-Mega-X") → id de sprite do Showdown
 * ("charizard-megax"). Inclui as megas, que só aparecem no meio da batalha.
 */
function spriteIds(sets) {
  const map = {};
  for (const set of sets) {
    const species = Dex.species.get(set.species);
    for (const name of [species.name, ...(species.otherFormes ?? []).filter((f) => f.includes('-Mega'))]) {
      map[name] = Dex.species.get(name).spriteid;
    }
  }
  return map;
}

/**
 * Nome da espécie no log → imagem do nosso banco (PokeAPI). Reserva pras
 * formas que o CDN do Showdown ainda não tem, como várias megas do Legends Z-A.
 */
function artworkUrls(teams) {
  const map = {};
  for (const member of teams.flatMap((team) => team.members)) {
    if (member.pokemon.sprite_url) map[findSpecies(member.pokemon.name).name] = member.pokemon.sprite_url;
  }
  return map;
}

/**
 * Uma batalha jogador (p1) × oponente (p2). O simulador roda síncrono: quando
 * os dois lados escolhem, o turno inteiro é resolvido na hora.
 */
export class Match {
  constructor({ ownerId, playerTeam, opponentTeam, opponent }) {
    this.id = randomUUID();
    this.ownerId = ownerId;
    this.opponent = opponent;
    this.errors = { p1: null, p2: null };

    this.battle = new Battle({
      formatid: FORMAT,
      send: (type, data) => {
        // Escolha inválida chega como "sideupdate" com "|error|".
        if (type !== 'sideupdate') return;
        const [side, message] = data.split('\n');
        if (message.startsWith('|error|')) this.errors[side] = message.slice('|error|'.length);
      },
    });
    // O Custom Game é formato de debug e mostraria o HP exato do oponente.
    this.battle.reportExactHP = false;
    const sets = [toShowdownTeam(playerTeam), toShowdownTeam(opponentTeam)];
    this.battle.setPlayer('p1', { name: 'Você', team: sets[0] });
    this.battle.setPlayer('p2', { name: 'Oponente', team: sets[1] });
    this.sprites = spriteIds(sets.flat());
    this.artwork = artworkUrls([playerTeam, opponentTeam]);
    this.thinking = false;
  }

  /**
   * Cria a batalha e já espera o oponente escolher os 4 da prévia de time.
   */
  static async create(options) {
    const match = new Match(options);
    await match.playOpponent();
    return match;
  }

  get ended() {
    return this.battle.ended;
  }

  /**
   * Aplica a escolha do jogador no formato do Showdown (ex: "move 1 2, move 2 1",
   * "team 1234", "switch 3") e espera o oponente decidir (pode ser uma chamada
   * de API). Devolve a mensagem de erro se a escolha for inválida.
   */
  async choose(choice) {
    if (this.ended) return 'A batalha já terminou.';
    if (this.thinking) return 'O oponente ainda está decidindo.';

    this.errors.p1 = null;
    if (!this.battle.choose('p1', choice)) {
      return this.errors.p1 ?? 'Escolha inválida.';
    }

    this.thinking = true;
    try {
      await this.playOpponent();
    } finally {
      this.thinking = false;
    }
    return null;
  }

  // O oponente escolhe enquanto tiver pedido pendente: a escolha dele pode
  // fechar o turno e gerar outro pedido na hora (ex: troca forçada depois
  // que um pokémon dele desmaia), sem passar pelo jogador.
  async playOpponent() {
    for (;;) {
      const request = this.battle.p2.activeRequest;
      if (this.ended || !request || request.wait || this.battle.p2.isChoiceDone()) return;

      // Plano B em cadeia: decisor da dificuldade → aleatório → escolha padrão
      // do simulador. A batalha nunca trava por causa da IA.
      let done = false;
      for (const decider of [this.opponent, randomOpponent]) {
        try {
          this.errors.p2 = null;
          // Relê o pedido: uma escolha recusada pode revelar informação nova
          // (ex: "preso" pela Shadow Tag do adversário) e o simulador atualiza.
          if (this.battle.choose('p2', await decider.choose(this.battle.p2.activeRequest, this.battle))) {
            done = true;
            break;
          }
          console.warn(`[battle ${this.id}] escolha inválida da IA: ${this.errors.p2}`);
        } catch (error) {
          console.warn(`[battle ${this.id}] IA falhou: ${error.message}`);
        }
      }
      if (!done && !this.battle.choose('p2', 'default')) return;
    }
  }

  /**
   * Estado visto pelo jogador: o log inteiro (sem as informações secretas do
   * oponente; uma batalha tem poucas centenas de linhas) e o pedido atual.
   */
  state() {
    return {
      id: this.id,
      ended: this.ended,
      winner: this.battle.winner || null,
      sprites: this.sprites,
      artwork: this.artwork,
      log: extractChannelMessages(this.battle.log.join('\n'), [1])[1],
      request: this.ended ? null : this.battle.p1.activeRequest,
    };
  }
}
