import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Match } from '../src/battle.js';
import { randomOpponent } from '../src/ai/random.js';
import { buildView } from '../src/ai/view.js';

const member = (name, ability, item, moves) => ({
  pokemon: { name },
  ability: { name: ability },
  item: item ? { name: item } : null,
  nature: 'hardy',
  stat_points: { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 },
  moves: moves.map((name) => ({ name })),
});

// Jogador (p1) com item e golpe "secretos" que a IA (p2) não pode ver antes de aparecerem.
const player = {
  members: [
    member('snorlax', 'immunity', 'leftovers', ['growl', 'body-slam']),
    member('garchomp', 'rough-skin', 'choice-scarf', ['dragon-claw']),
  ],
};
const ai = { members: [member('pikachu', 'static', 'light-ball', ['thunderbolt']), member('gengar', 'cursed-body', null, ['shadow-ball'])] };

function hasEmpty(value) {
  if (value === null || value === false) return true;
  if (typeof value !== 'object') return false;
  if (Object.keys(value).length === 0) return true;
  return Object.values(value).some(hasEmpty);
}

test('visão da IA: sem segredo do jogador, sem campo vazio, sem efeito interno', async () => {
  const match = await Match.create({ ownerId: 1, playerTeam: player, opponentTeam: ai, opponent: randomOpponent });
  await match.choose('team 12');
  // Snorlax usa Growl (revela só o Growl); Garchomp usa Dragon Claw.
  await match.choose('move 1, move 1 1');

  const view = buildView(match.battle, match.battle.p2.activeRequest);
  const text = JSON.stringify(view);

  assert.ok(!text.includes('Body Slam') && !text.includes('bodyslam'), 'golpe não usado vazou');
  assert.ok(!text.includes('Choice Scarf') && !text.includes('choicescarf'), 'item não revelado vazou');
  assert.ok(!/"hp":"\d+\/\d+"/.test(JSON.stringify(view.adversario)), 'HP exato do jogador vazou');
  assert.ok(!text.includes('"stall"'));
  assert.ok(!hasEmpty(view), `campo vazio enviado: ${text}`);
  assert.ok(view.seu_lado.every((p) => p.hp === 0 || p.vel > 0), 'velocidade do próprio lado');
});
