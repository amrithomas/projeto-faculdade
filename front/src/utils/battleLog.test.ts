import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describe, parseCondition, readField } from './battleLog.ts';

const log = [
  '|poke|p2|Venusaur, L50, M|',
  '|poke|p2|Charizard, L50, M|',
  '|switch|p1a: Charizard|Charizard, L50, F|185/185',
  '|switch|p2a: Venusaur|Venusaur, L50, M|100/100',
  '|turn|1',
  '|detailschange|p1a: Charizard|Charizard-Mega-X, L50, F',
  '|-mega|p1a: Charizard|Charizard|Charizardite X',
  '|-weather|SunnyDay',
  '|-fieldstart|move: Grassy Terrain|[from] ability: Grassy Surge|[of] p1b: Rillaboom',
  '|-damage|p2a: Venusaur|31/100',
  '|-status|p2a: Venusaur|par',
  '|-damage|p1a: Charizard|170/185|[from] item: Life Orb',
  '|turn|2',
  '|-fieldend|move: Grassy Terrain',
  '|faint|p2a: Venusaur',
];

test('reconstrói o campo a partir do log', () => {
  const field = readField(log);
  assert.equal(field.turn, 2);
  assert.deepEqual(field.opponentPreview, ['Venusaur', 'Charizard']);
  assert.deepEqual(field.active.p1a, {
    species: 'Charizard-Mega-X', hp: 170, maxHp: 185, status: '', boosts: {}, volatiles: [],
  });
  assert.equal(field.active.p2a?.status, 'fnt');
  assert.equal(field.weather, 'Sol forte');
  assert.deepEqual(field.field, []);
});

test('atributos, efeitos, terreno e condições de cada lado', () => {
  const field = readField([
    '|switch|p1a: Archaludon|Archaludon, L50, F|178/178',
    '|switch|p2a: Lunala|Lunala, L50|100/100',
    '|-boost|p1a: Archaludon|def|1',
    '|-boost|p1a: Archaludon|def|1',
    '|-boost|p1a: Archaludon|spa|1',
    '|-unboost|p1a: Archaludon|spe|2',
    '|-boost|p1a: Archaludon|spa|6',
    '|-start|p1a: Archaludon|Substitute',
    '|-start|p2a: Lunala|move: Taunt',
    '|-start|p2a: Lunala|protosynthesisspe',
    '|-start|p2a: Lunala|perish3',
    '|-start|p2a: Lunala|perish2',
    '|-end|p1a: Archaludon|Substitute',
    '|-fieldstart|move: Grassy Terrain|[from] ability: Grassy Surge|[of] p1b: Rillaboom',
    '|-fieldstart|move: Trick Room|[of] p2a: Lunala',
    '|-fieldstart|move: Electric Terrain',
    '|-sidestart|p1: Você|move: Tailwind',
    '|-sidestart|p2: Oponente|Reflect',
    '|-sideend|p2: Oponente|Reflect',
  ]);
  assert.deepEqual(field.active.p1a?.boosts, { def: 2, spa: 6, spe: -2 });
  assert.deepEqual(field.active.p1a?.volatiles, []);
  assert.deepEqual(field.active.p2a?.volatiles, ['Taunt', 'Protosynthesis (Vel)', 'perish2']);
  // Terreno novo substitui o anterior; Trick Room continua.
  assert.deepEqual(field.field, ['Trick Room', 'Electric Terrain']);
  assert.deepEqual(field.sides, { p1: ['Tailwind'], p2: [] });

  // Trocar de pokémon zera atributos e efeitos.
  const after = readField(['|switch|p1a: A|A, L50|10/10', '|-boost|p1a: A|atk|2', '|switch|p1a: B|B, L50|10/10']);
  assert.deepEqual(after.active.p1a?.boosts, {});
});

test('lê HP e status da condição', () => {
  assert.deepEqual(parseCondition('120/175 par'), { hp: 120, maxHp: 175, status: 'par' });
  assert.deepEqual(parseCondition('0 fnt'), { hp: 0, maxHp: 100, status: 'fnt' });
});

test('descreve as linhas em português e esconde as internas', () => {
  assert.equal(describe('|move|p1a: Charizard|Flare Blitz|p2a: Venusaur'), 'Seu Charizard usou Flare Blitz!');
  assert.equal(describe('|-damage|p1a: Charizard|170/185|[from] item: Life Orb'), 'Seu Charizard sofreu dano (Life Orb). HP: 170/185');
  assert.equal(describe('|switch|p2b: Pikachu|Pikachu, L50, F|100/100'), 'O oponente enviou Pikachu!');
  assert.equal(describe('|win|Você'), 'Você venceu a batalha!');
  assert.equal(describe('|-damage|p1b: Calyrex|37/175 brn|[from] brn'), 'Seu Calyrex sofreu dano (queimadura). HP: 37/175');
  assert.equal(describe('|-boost|p1a: Calyrex|spe|2'), 'Velocidade de seu Calyrex subiu 2 nível(is)!');
  assert.equal(describe('|-boost|p1a: Calyrex|spe|0'), 'Velocidade de seu Calyrex não pode subir mais!');
  assert.equal(describe('|-weather|SunnyDay|[upkeep]'), null);
  // Clima e terreno sempre dizem de onde vieram (habilidade); por golpe, a linha anterior já diz.
  assert.equal(
    describe('|-weather|SunnyDay|[from] ability: Drought|[of] p2b: Charizard'),
    'Sol forte começou (Drought de Charizard do oponente)!',
  );
  assert.equal(describe('|-weather|RainDance'), 'Chuva começou!');
  assert.equal(
    describe('|-fieldstart|move: Grassy Terrain|[from] ability: Grassy Surge|[of] p1a: Rillaboom'),
    'Grassy Terrain entrou em efeito (Grassy Surge de seu Rillaboom)!',
  );
  assert.equal(describe('|request|{}'), null);
});
