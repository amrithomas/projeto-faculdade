import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildChoice, slotsToDecide, switchOptions, targetsFor } from './battleChoice.ts';
import type { BattleRequest } from '../types/battle.ts';

const mon = (condition: string, active: boolean) => ({
  ident: 'p1: X', details: 'X, L50', condition, active, moves: [], item: '', ability: '',
});

test('alvos em duplas seguem a numeração do Showdown', () => {
  assert.deepEqual(targetsFor('normal', 0).map((t) => t.value), [1, 2, -2]);
  assert.deepEqual(targetsFor('normal', 1).map((t) => t.value), [1, 2, -1]);
  assert.deepEqual(targetsFor('adjacentAllyOrSelf', 1).map((t) => t.value), [-2, -1]);
  assert.deepEqual(targetsFor('allAdjacentFoes', 0), []);
  assert.deepEqual(targetsFor('self', 0), []);
});

test('monta a escolha com alvo, mega, troca e pass', () => {
  assert.equal(
    buildChoice([{ kind: 'move', move: 1, target: 2, mega: true }, { kind: 'switch', slot: 4 }]),
    'move 1 2 mega, switch 4',
  );
  assert.equal(buildChoice([{ kind: 'move', move: 3 }, { kind: 'pass' }]), 'move 3, pass');
});

test('desmaiado sem troca forçada passa a vez; reservas exclui ativos e desmaiados', () => {
  const request: BattleRequest = {
    active: [{ moves: [] }, { moves: [] }],
    side: { pokemon: [mon('0 fnt', true), mon('100/150', true), mon('0 fnt', false), mon('80/120', false)] },
  };
  assert.deepEqual(slotsToDecide(request), [false, true]);
  assert.deepEqual(switchOptions(request), [4]);
  assert.deepEqual(slotsToDecide({ ...request, forceSwitch: [true, false] }), [true, false]);
});
