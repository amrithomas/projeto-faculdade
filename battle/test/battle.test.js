import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Match, toShowdownTeam } from '../src/battle.js';
import { randomOpponent } from '../src/ai/random.js';

const points = (speed = 0) => ({
  hp: 32, attack: 0, defense: 0, 'special-attack': 2, 'special-defense': 0, speed,
});

const member = (name, ability, item, moves, nature = 'modest') => ({
  pokemon: { name },
  ability: { name: ability },
  item: item ? { name: item } : null,
  nature,
  stat_points: points(32),
  moves: moves.map((name) => ({ name })),
});

// Mesmo formato do TeamResource do Laravel.
const teamA = {
  members: [
    member('charizard-mega-x', 'blaze', 'charizardite-x', ['flare-blitz', 'dragon-claw', 'protect']),
    member('garchomp', 'rough-skin', 'life-orb', ['earthquake', 'dragon-claw', 'rock-slide']),
    member('incineroar', 'intimidate', 'sitrus-berry', ['fake-out', 'flare-blitz', 'parting-shot']),
    member('rillaboom', 'grassy-surge', null, ['grassy-glide', 'wood-hammer', 'u-turn']),
  ],
};
const teamB = {
  members: [
    member('pikachu', 'static', 'light-ball', ['thunderbolt', 'protect']),
    member('gengar', 'cursed-body', 'gengarite', ['shadow-ball', 'sludge-bomb']),
    member('dragonite', 'multiscale', 'leftovers', ['extreme-speed', 'dragon-claw']),
    member('tyranitar', 'sand-stream', null, ['rock-slide', 'crunch']),
  ],
};

const defaultOpponent = { choose: () => 'default' };

test('mega entra como forma base segurando a pedra, com a habilidade da base e stat points como EVs', () => {
  const [charizard] = toShowdownTeam(teamA);
  assert.equal(charizard.species, 'Charizard');
  assert.equal(charizard.item, 'charizardite-x');
  assert.equal(charizard.ability, 'Blaze');

  // Mega Charizard Y salva com Drought: antes de mega evoluir não pode ter sol.
  const [megaY] = toShowdownTeam({ members: [member('charizard-mega-y', 'drought', 'charizardite-y', ['flamethrower'])] });
  assert.equal(megaY.ability, 'Blaze');
  assert.deepEqual(charizard.evs, { hp: 32, atk: 0, def: 0, spa: 2, spd: 0, spe: 32 });
});

test('forma padrão com sufixo da PokeAPI cai na espécie do Showdown', () => {
  const [basculegion, meowstic] = toShowdownTeam({
    members: [
      member('basculegion-male', 'swift-swim', null, ['wave-crash']),
      member('meowstic-male-mega', 'prankster', 'meowsticite', ['fake-out']),
    ],
  });
  assert.equal(basculegion.species, 'Basculegion');
  assert.equal(meowstic.species, 'Meowstic');
});

test('imagem do nosso banco fica de reserva pra forma que o Showdown não tem sprite', () => {
  const garchompZ = {
    ...member('garchomp-mega-z', 'rough-skin', 'garchompite-z', ['earthquake']),
    pokemon: { name: 'garchomp-mega-z', sprite_url: 'https://pokeapi/10309.png' },
  };
  const match = new Match({ ownerId: 1, playerTeam: { members: [garchompZ, ...teamA.members.slice(1)] }, opponentTeam: teamB, opponent: defaultOpponent });
  assert.equal(match.state().artwork['Garchomp-Mega-Z'], 'https://pokeapi/10309.png');
});

test('pokémon desconhecido gera erro claro', () => {
  assert.throws(() => toShowdownTeam({ members: [member('pokemon-inventado', 'x', null, ['tackle'])] }), /pokemon-inventado/);
});

test('batalhas aleatórias × aleatório chegam ao fim sem travar nem escolha inválida', async () => {
  // A ordem das quedas varia: várias batalhas cobrem troca forçada no meio do
  // turno, mega, alvos e pokémon preso. O jogador também joga no aleatório.
  for (let i = 0; i < 30; i++) {
    const match = await Match.create({ ownerId: 1, playerTeam: teamA, opponentTeam: teamB, opponent: randomOpponent });
    for (let turn = 0; turn < 300 && !match.ended; turn++) {
      const request = match.state().request;
      assert.ok(!request.wait, `batalha ${i}, turno ${turn}: jogador travado esperando`);
      let choice = randomOpponent.choose(request);
      let error = await match.choose(choice);
      // "Preso" por habilidade escondida (Shadow Tag) só aparece ao tentar
      // trocar; o pedido atualizado já vem com trapped e o jogador escolhe de novo.
      if (error?.startsWith('[Unavailable choice]')) {
        choice = randomOpponent.choose(match.state().request);
        error = await match.choose(choice);
      }
      assert.equal(error, null, `batalha ${i}: "${choice}" recusada: ${error}`);
    }
    assert.ok(match.ended);
  }
});

test('IA que falha, demora ou erra cai no plano B sem travar a batalha', async () => {
  const opponents = {
    lança: { choose: () => Promise.reject(new Error('API fora do ar')) },
    inválida: { choose: () => 'move 9 9' },
    lenta: { choose: (request) => new Promise((resolve) => setTimeout(() => resolve(randomOpponent.choose(request)), 20)) },
  };
  for (const [name, opponent] of Object.entries(opponents)) {
    const match = await Match.create({ ownerId: 1, playerTeam: teamA, opponentTeam: teamB, opponent });
    for (let turn = 0; turn < 300 && !match.ended; turn++) {
      assert.equal(await match.choose('default'), null, `oponente ${name}`);
    }
    assert.ok(match.ended, `oponente ${name}`);
  }
});

test('jogador não manda outra jogada enquanto o oponente pensa', async () => {
  // O oponente "pensa" (fica pendente) uma única vez, depois que block vira true.
  let block = false;
  let release;
  const opponent = {
    choose: () => {
      if (!block) return 'default';
      block = false;
      return new Promise((resolve) => (release = () => resolve('default')));
    },
  };
  const match = await Match.create({ ownerId: 1, playerTeam: teamA, opponentTeam: teamB, opponent });
  await match.choose('team 1234');

  block = true;
  const pending = match.choose('default');
  assert.ok(match.thinking);
  assert.equal(await match.choose('default'), 'O oponente ainda está decidindo.');
  release();
  assert.equal(await pending, null);
  assert.ok(!match.thinking);
});

test('batalha completa até o fim, com prévia de time e escolhas inválidas recusadas', async () => {
  const match = await Match.create({ ownerId: 1, playerTeam: teamA, opponentTeam: teamB, opponent: defaultOpponent });

  assert.ok(match.state().request.teamPreview);
  assert.equal(match.state().sprites['Charizard-Mega-X'], 'charizard-megax');
  assert.match(await match.choose('move 9'), /.+/);
  assert.equal(await match.choose('team 1234'), null);

  // Golpe que acerta os dois oponentes não aceita alvo.
  assert.match(await match.choose('move 1 1, move 3 1'), /Rock Slide/);

  // Primeiro turno: Charizard mega evolui.
  assert.equal(await match.choose('move 1 1 mega, move 2 1'), null);
  assert.ok(match.state().log.some((line) => line.startsWith('|-mega|p1a: Charizard')));

  for (let turn = 0; turn < 200 && !match.ended; turn++) {
    assert.equal(await match.choose('default'), null);
  }

  const state = match.state();
  assert.ok(state.ended);
  assert.ok(['Você', 'Oponente'].includes(state.winner));
  assert.equal(state.request, null);
  // O jogador vê o HP do oponente só em porcentagem.
  const opponentHp = state.log.filter((line) => /^\|-damage\|p2a/.test(line));
  assert.ok(opponentHp.every((line) => /\/100/.test(line) || /0 fnt/.test(line)));
});
