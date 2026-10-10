import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildChoice, slotOptions } from '../src/ai/options.js';
import { randomOpponent } from '../src/ai/random.js';

const mon = (species, condition, active) => ({ ident: `p2: ${species}`, details: `${species}, L50`, condition, active });
const move = (name, target, extra = {}) => ({ move: name, id: name.toLowerCase(), pp: 10, maxpp: 10, target, ...extra });

const side = {
  pokemon: [mon('Charizard', '100/150', true), mon('Garchomp', '120/180', true), mon('Pikachu', '90/90', false), mon('Gengar', '0 fnt', false)],
};

test('opções por posição: alvos, mega, troca, golpe sem PP e preso', () => {
  const [charizard, garchomp] = slotOptions({
    side,
    active: [
      { moves: [move('Flamethrower', 'normal'), move('Protect', 'self'), move('Ember', 'normal', { pp: 0 })], canMegaEvo: true },
      { moves: [move('Earthquake', 'allAdjacent'), move('Helping Hand', 'adjacentAlly')], trapped: true },
    ],
  });

  assert.deepEqual(charizard.map((o) => o.choice), [
    'move 1 1', 'move 1 1 mega', 'move 1 2', 'move 1 2 mega', 'move 1 -2', 'move 1 -2 mega',
    'move 2', 'move 2 mega',
    'switch 3', // Gengar desmaiado e Ember sem PP ficam de fora
  ]);
  // Posição 2: aliado é -1; preso não troca.
  assert.deepEqual(garchomp.map((o) => o.choice), ['move 1', 'move 2 -1']);
});

test('troca forçada só pra quem precisa; desmaiado sem troca passa', () => {
  const options = slotOptions({ side, forceSwitch: [false, true] });
  assert.deepEqual(options.map((list) => list.map((o) => o.choice)), [[], ['switch 3']]);
  assert.equal(buildChoice([null, options[1][0]]), 'pass, switch 3');
});

test('combinação impossível é recusada', () => {
  const megaA = { choice: 'move 1 1 mega', mega: true };
  const megaB = { choice: 'move 1 2 mega', mega: true };
  assert.throws(() => buildChoice([megaA, megaB]), /mega/);
  assert.throws(() => buildChoice([{ choice: 'switch 3', switchTo: 3 }, { choice: 'switch 3', switchTo: 3 }]), /reserva/);
});

test('aleatório nunca combina duas megas nem troca os dois pro mesmo reserva', () => {
  const request = {
    side: { pokemon: [...side.pokemon.slice(0, 3), mon('Gengar', '50/60', false)] },
    active: [{ moves: [move('Protect', 'self')], canMegaEvo: true }, { moves: [move('Protect', 'self')], canMegaEvo: true }],
  };
  for (let i = 0; i < 200; i++) {
    const choice = randomOpponent.choose(request);
    assert.ok((choice.match(/mega/g) ?? []).length <= 1, choice);
    const switches = choice.match(/switch \d/g) ?? [];
    assert.equal(new Set(switches).size, switches.length, choice);
  }
});

test('prévia de time: escolhe 4 diferentes', () => {
  const choice = randomOpponent.choose({ teamPreview: true, maxChosenTeamSize: 4, side: { pokemon: Array(6).fill(side.pokemon[0]) } });
  const order = choice.replace('team ', '').split('');
  assert.equal(order.length, 4);
  assert.equal(new Set(order).size, 4);
});
