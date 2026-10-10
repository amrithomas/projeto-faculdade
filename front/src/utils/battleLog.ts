// Lê o log de batalha no protocolo do Pokémon Showdown
// (https://github.com/smogon/pokemon-showdown/blob/master/sim/SIM-PROTOCOL.md).

export type Position = 'p1a' | 'p1b' | 'p2a' | 'p2b';

export interface FieldPokemon {
  species: string;
  hp: number;
  maxHp: number;
  status: string;
  // Estágios de atributo (-6 a +6): { atk: 1, spe: -1 }. Zeram ao sair de campo.
  boosts: Record<string, number>;
  // Efeitos no pokémon: Substitute, Taunt, confusão, Leech Seed...
  volatiles: string[];
}

export interface Field {
  turn: number;
  active: Record<Position, FieldPokemon | null>;
  weather: string | null;
  // Efeitos no campo todo: terrenos, Trick Room, Gravity...
  field: string[];
  // Efeitos de um lado só: Reflect, Light Screen, Tailwind, Stealth Rock...
  sides: Record<'p1' | 'p2', string[]>;
  // Os 6 do oponente mostrados na prévia de time.
  opponentPreview: string[];
}

export const BOOST_LABEL: Record<string, string> = {
  atk: 'Atq',
  def: 'Def',
  spa: 'Atq Esp',
  spd: 'Def Esp',
  spe: 'Vel',
  accuracy: 'Precisão',
  evasion: 'Evasão',
};

const WEATHER: Record<string, string> = {
  SunnyDay: 'Sol forte',
  DesolateLand: 'Sol extremo',
  RainDance: 'Chuva',
  PrimordialSea: 'Chuva torrencial',
  Sandstorm: 'Tempestade de areia',
  Snowscape: 'Neve',
  Hail: 'Granizo',
  DeltaStream: 'Ventos misteriosos',
};

const STATUS: Record<string, string> = {
  brn: 'queimado',
  par: 'paralisado',
  slp: 'dormindo',
  frz: 'congelado',
  psn: 'envenenado',
  tox: 'gravemente envenenado',
};

// Dano de status no fim do turno vem como "[from] brn".
const STATUS_DAMAGE: Record<string, string> = { brn: 'queimadura', psn: 'veneno', tox: 'veneno' };

const STAT: Record<string, string> = {
  atk: 'Ataque',
  def: 'Defesa',
  spa: 'Ataque Especial',
  spd: 'Defesa Especial',
  spe: 'Velocidade',
  accuracy: 'Precisão',
  evasion: 'Evasão',
};

// Sprites do próprio Showdown: cobrem todas as formas, inclusive as megas.
export function spriteUrl(species: string, sprites: Record<string, string>, back = false): string {
  const id = sprites[species] ?? species.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `https://play.pokemonshowdown.com/sprites/${back ? 'gen5-back' : 'gen5'}/${id}.png`;
}

// "120/175 par", "47/100", "0 fnt"
export function parseCondition(condition: string): Pick<FieldPokemon, 'hp' | 'maxHp' | 'status'> {
  const [hpPart, status = ''] = condition.split(' ');
  if (status === 'fnt') return { hp: 0, maxHp: 100, status: 'fnt' };
  const [hp, maxHp = '100'] = hpPart.split('/');
  return { hp: Number(hp), maxHp: Number(maxHp), status };
}

// "p2a: Venusaur" → "p2a"
function position(ident: string): Position {
  return ident.slice(0, 3) as Position;
}

// "Charizard-Mega-X, L50, F" → "Charizard-Mega-X"
function species(details: string): string {
  return details.split(',')[0];
}

// "move: Grassy Terrain" → "Grassy Terrain"; "protosynthesisspe" → "Protosynthesis (Vel)"
function effectName(effect: string): string {
  const paradox = /^(protosynthesis|quarkdrive)(atk|def|spa|spd|spe)$/.exec(effect);
  if (paradox) return `${paradox[1] === 'quarkdrive' ? 'Quark Drive' : 'Protosynthesis'} (${BOOST_LABEL[paradox[2]]})`;
  return effect.replace(/^(move|ability|item): /, '');
}

export function readField(log: string[]): Field {
  const field: Field = {
    turn: 0,
    active: { p1a: null, p1b: null, p2a: null, p2b: null },
    weather: null,
    field: [],
    sides: { p1: [], p2: [] },
    opponentPreview: [],
  };
  const add = (list: string[], name: string) => (list.includes(name) ? list : [...list, name]);
  const remove = (list: string[], name: string) => list.filter((item) => item !== name);

  for (const line of log) {
    const [, type, a = '', b = '', c = ''] = line.split('|');
    const mon = () => field.active[position(a)];
    const side = a.slice(0, 2) as 'p1' | 'p2';

    switch (type) {
      case 'turn':
        field.turn = Number(a);
        break;
      case 'poke':
        if (a === 'p2') field.opponentPreview.push(species(b));
        break;
      case 'switch':
      case 'drag':
      case 'replace':
        field.active[position(a)] = { species: species(b), ...parseCondition(c), boosts: {}, volatiles: [] };
        break;
      case '-boost':
      case '-unboost':
      case '-setboost': {
        const pokemon = mon();
        if (!pokemon) break;
        const value = type === '-setboost' ? Number(c) : (pokemon.boosts[b] ?? 0) + Number(c) * (type === '-unboost' ? -1 : 1);
        pokemon.boosts[b] = Math.max(-6, Math.min(6, value));
        break;
      }
      case '-clearboost': {
        const pokemon = mon();
        if (pokemon) pokemon.boosts = {};
        break;
      }
      case '-clearnegativeboost': {
        const pokemon = mon();
        if (pokemon) pokemon.boosts = Object.fromEntries(Object.entries(pokemon.boosts).filter(([, v]) => v > 0));
        break;
      }
      case '-clearallboost':
        for (const pokemon of Object.values(field.active)) if (pokemon) pokemon.boosts = {};
        break;
      case '-start': {
        const pokemon = mon();
        // Perish Song conta 3, 2, 1: fica só a contagem atual.
        if (pokemon) pokemon.volatiles = add(pokemon.volatiles.filter((v) => !/^perish/.test(v)), effectName(b));
        break;
      }
      case '-end': {
        const pokemon = mon();
        if (pokemon) pokemon.volatiles = remove(pokemon.volatiles, effectName(b));
        break;
      }
      case 'detailschange': {
        const pokemon = mon();
        if (pokemon) pokemon.species = species(b);
        break;
      }
      case '-damage':
      case '-heal':
      case '-sethp': {
        const pokemon = mon();
        if (pokemon) Object.assign(pokemon, parseCondition(b));
        break;
      }
      case 'faint': {
        const pokemon = mon();
        if (pokemon) Object.assign(pokemon, { hp: 0, status: 'fnt' });
        break;
      }
      case '-status': {
        const pokemon = mon();
        if (pokemon) pokemon.status = b;
        break;
      }
      case '-curestatus': {
        const pokemon = mon();
        if (pokemon) pokemon.status = '';
        break;
      }
      case '-weather':
        field.weather = a === 'none' ? null : (WEATHER[a] ?? a);
        break;
      case '-fieldstart':
        // Só um terreno por vez: um novo substitui o anterior.
        if (a.endsWith('Terrain')) field.field = field.field.filter((f) => !f.endsWith('Terrain'));
        field.field = add(field.field, effectName(a));
        break;
      case '-fieldend':
        field.field = remove(field.field, effectName(a));
        break;
      case '-sidestart':
        field.sides[side] = add(field.sides[side], effectName(b));
        break;
      case '-sideend':
        field.sides[side] = remove(field.sides[side], effectName(b));
        break;
    }
  }

  return field;
}

// "p1: Você" / "p1" → "Seu lado"
function sideLabel(side: string): string {
  return side.startsWith('p1') ? 'Seu lado' : 'Lado do oponente';
}

// "p2a: Venusaur" → "Venusaur do oponente" / "p1a: Rillaboom" → "seu Rillaboom"
function who(ident: string): string {
  const name = ident.slice(ident.indexOf(':') + 2) || ident;
  return ident.startsWith('p1') ? `seu ${name}` : `${name} do oponente`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Uma linha do log em português (null para linhas que a tela não mostra).
 */
export function describe(line: string): string | null {
  const [, type, a = '', b = '', c = '', ...rest] = line.split('|');
  const tags = [b, c, ...rest];
  const from = tags.find((part) => part.startsWith('[from]'))?.slice('[from] '.length);
  const of = tags.find((part) => part.startsWith('[of]'))?.slice('[of] '.length);
  // "(Drought de Charizard do oponente)", "(Life Orb)", "(queimadura)"; golpe não tem [from].
  const source = from ? ` (${STATUS_DAMAGE[from] ?? effectName(from)}${of ? ` de ${who(of)}` : ''})` : '';

  switch (type) {
    case 'turn':
      return `— Turno ${a} —`;
    case 'move':
      return `${capitalize(who(a))} usou ${b}!`;
    case 'switch':
    case 'drag':
      return a.startsWith('p1') ? `Vai, ${species(b)}!` : `O oponente enviou ${species(b)}!`;
    case '-damage':
      return `${capitalize(who(a))} sofreu dano${source}. HP: ${b.split(' ')[0]}`;
    case '-heal':
      return `${capitalize(who(a))} recuperou HP${source}. HP: ${b.split(' ')[0]}`;
    case 'faint':
      return `${capitalize(who(a))} desmaiou!`;
    case '-supereffective':
      return 'É super efetivo!';
    case '-resisted':
      return 'Não é muito efetivo...';
    case '-immune':
      return `Não afeta ${who(a)}...`;
    case '-crit':
      return 'Um golpe crítico!';
    case '-miss':
      return `${capitalize(who(a))} errou o ataque!`;
    case '-fail':
      return 'Mas falhou!';
    case '-status':
      return `${capitalize(who(a))} ficou ${STATUS[b] ?? b}!`;
    case '-curestatus':
      return `${capitalize(who(a))} não está mais ${STATUS[b] ?? b}.`;
    case '-boost':
    case '-unboost':
      // 0 = o atributo já estava no limite (+6/-6).
      if (c === '0') return `${STAT[b] ?? b} de ${who(a)} não pode ${type === '-boost' ? 'subir' : 'cair'} mais!`;
      return `${STAT[b] ?? b} de ${who(a)} ${type === '-boost' ? 'subiu' : 'caiu'} ${c} nível(is)!`;
    case '-weather':
      if (a === 'none') return 'O clima voltou ao normal.';
      return line.includes('[upkeep]') ? null : `${WEATHER[a] ?? a} começou${source}!`;
    case '-fieldstart':
      return `${effectName(a)} entrou em efeito${source}!`;
    case '-fieldend':
      return `${effectName(a)} acabou.`;
    case '-sidestart':
      return `${effectName(b)} protege ${sideLabel(a).toLowerCase()}!`;
    case '-sideend':
      return `${effectName(b)} acabou (${sideLabel(a).toLowerCase()}).`;
    case '-mega':
      return `${capitalize(who(a))} mega evoluiu!`;
    case '-ability':
      return `${capitalize(who(a))}: ${b}!`;
    case '-enditem':
      return `${capitalize(who(a))} usou/perdeu ${b}.`;
    case '-activate':
      return `${capitalize(who(a))}: ${effectName(b)}!`;
    case 'cant':
      return `${capitalize(who(a))} não conseguiu agir (${effectName(b)}).`;
    case 'win':
      return a === 'Você' ? 'Você venceu a batalha!' : 'O oponente venceu a batalha.';
    case 'tie':
      return 'A batalha terminou empatada.';
    default:
      return null;
  }
}
