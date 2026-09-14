// Cores dos tipos de Pokémon, usadas nos badges de tipo (MUI Chip).
export const TYPE_COLORS: Record<string, string> = {
  normal: '#A3A3A3',
  fire: '#F97316',
  water: '#3B82F6',
  electric: '#FACC15',
  grass: '#22C55E',
  ice: '#67E8F9',
  fighting: '#B91C1C',
  poison: '#A855F7',
  ground: '#D97706',
  flying: '#A5B4FC',
  psychic: '#EC4899',
  bug: '#84CC16',
  rock: '#A16207',
  ghost: '#6D28D9',
  dragon: '#4F46E5',
  dark: '#404040',
  steel: '#94A3B8',
  fairy: '#F9A8D4',
};

// Tipos com fundo claro precisam de texto escuro pra manter contraste.
const DARK_TEXT_TYPES = new Set(['electric', 'ice', 'flying', 'bug', 'steel', 'fairy']);

export function typeColor(type: string): string {
  return TYPE_COLORS[type] ?? '#A3A3A3';
}

export function typeTextColor(type: string): string {
  return DARK_TEXT_TYPES.has(type) ? 'rgba(0,0,0,0.87)' : '#FFFFFF';
}
