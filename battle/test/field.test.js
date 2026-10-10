import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Match } from '../src/battle.js';

const member = (name, ability, moves, item = null) => ({
  pokemon: { name },
  ability: { name: ability },
  item: item ? { name: item } : null,
  nature: 'hardy',
  stat_points: { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
  moves: moves.map((name) => ({ name })),
});

// Duplas precisam de 2 em campo: completa com um Snorlax que só usa Growl.
const team = (...members) => ({ members: [...members, member('snorlax', 'immunity', ['growl'])].slice(0, Math.max(2, members.length)) });

/** Joga até `turns` turnos e devolve o log visto pelo jogador. */
async function play(playerTeam, opponentTeam, { player = () => 'default', opponent = () => 'default', turns = 1 } = {}) {
  const match = await Match.create({
    ownerId: 1,
    playerTeam,
    opponentTeam,
    opponent: { choose: (request) => (request.teamPreview ? 'default' : opponent(request)) },
  });
  await match.choose('default');
  for (let turn = 1; turn <= turns && !match.ended; turn++) {
    assert.equal(await match.choose(player(turn)), null);
  }
  return match.state().log;
}

const weatherLines = (log) => log.filter((line) => line.startsWith('|-weather|') && !line.includes('[upkeep]'));

test('sem habilidade nem golpe de clima, a batalha não tem clima', async () => {
  const log = await play(team(member('snorlax', 'immunity', ['growl'])), team(member('snorlax', 'immunity', ['growl'])), { turns: 3 });
  assert.deepEqual(weatherLines(log), []);
});

test('clima por habilidade ao entrar em campo (Drought, Sand Stream)', async () => {
  const log = await play(
    team(member('torkoal', 'drought', ['growl']), member('snorlax', 'immunity', ['growl'])),
    team(member('tyranitar', 'sand-stream', ['growl']), member('snorlax', 'immunity', ['growl'])),
  );
  const lines = weatherLines(log);
  assert.ok(lines.some((l) => l.startsWith('|-weather|SunnyDay|[from] ability: Drought|[of] p1')));
  assert.ok(lines.some((l) => l.startsWith('|-weather|Sandstorm|[from] ability: Sand Stream|[of] p2')));
});

test('clima por golpe (Rain Dance) e terreno por golpe (Grassy Terrain)', async () => {
  const log = await play(
    team(member('pikachu', 'static', ['rain-dance']), member('venusaur', 'overgrow', ['grassy-terrain'])),
    team(member('snorlax', 'immunity', ['growl']), member('snorlax', 'immunity', ['growl'])),
  );
  const rain = log.findIndex((l) => l === '|-weather|RainDance');
  assert.ok(rain > 0, 'chuva começou sem habilidade');
  assert.match(log[rain - 1], /\|move\|p1a: Pikachu\|Rain Dance/);
  assert.ok(log.includes('|-fieldstart|move: Grassy Terrain'));
});

test('terreno por habilidade (Grassy Surge)', async () => {
  const log = await play(team(member('rillaboom', 'grassy-surge', ['growl'])), team(member('snorlax', 'immunity', ['growl'])));
  assert.ok(log.some((l) => l.startsWith('|-fieldstart|move: Grassy Terrain|[from] ability: Grassy Surge|[of] p1a')));
});

test('Mega Charizard Y só traz sol depois de mega evoluir', async () => {
  const log = await play(
    team(member('charizard-mega-y', 'drought', ['flamethrower'], 'charizardite-y')),
    team(member('snorlax', 'immunity', ['growl'])),
    { player: () => 'move 1 1 mega, move 1' },
  );
  const mega = log.findIndex((l) => l.startsWith('|-mega|p1a: Charizard'));
  const sun = log.findIndex((l) => l.startsWith('|-weather|SunnyDay|[from] ability: Drought'));
  assert.ok(mega > 0 && sun > mega, 'sol veio da Drought da mega, depois de mega evoluir');
});

test('sol aumenta o dano de golpe de fogo', async () => {
  // Dano do Flamethrower do Torkoal do oponente no Snorlax do jogador, com e sem sol.
  const damage = async (ability) => {
    const log = await play(
      team(member('snorlax', 'immunity', ['growl']), member('snorlax', 'immunity', ['growl'])),
      team(member('torkoal', ability, ['flamethrower']), member('snorlax', 'immunity', ['growl'])),
      { opponent: () => 'move 1 1, move 1' },
    );
    if (log.some((l) => l.startsWith('|-crit|'))) return null; // crítico distorce a comparação
    const hit = log.find((l) => l.startsWith('|-damage|p1a: Snorlax|') && !l.includes('[from]'));
    const [hp, max] = hit.split('|')[3].split('/').map(Number);
    return max - hp;
  };

  const runs = async (ability) =>
    (await Promise.all(Array.from({ length: 6 }, () => damage(ability)))).filter((d) => d !== null);
  // Sol = x1,5. Mesmo no pior sorteio (85%) com sol, passa o melhor sem sol (100%).
  assert.ok(Math.min(...(await runs('drought'))) > Math.max(...(await runs('white-smoke'))));
});

test('tempestade de areia causa dano no fim do turno', async () => {
  const log = await play(team(member('snorlax', 'immunity', ['growl'])), team(member('tyranitar', 'sand-stream', ['growl'])));
  assert.ok(log.some((l) => l.startsWith('|-damage|p1a: Snorlax|') && l.includes('[from] Sandstorm')));
});
