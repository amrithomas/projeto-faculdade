import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { BattleState } from '../../types/battle';
import { BOOST_LABEL, type Field, type FieldPokemon, type Position } from '../../utils/battleLog';
import { PokemonSprite } from './PokemonSprite';

type Images = Pick<BattleState, 'sprites' | 'artwork'>;

const STATUS_LABEL: Record<string, string> = {
  brn: 'QUE', par: 'PAR', slp: 'DOR', frz: 'CON', psn: 'ENV', tox: 'TOX',
};

// Cor do céu pelo clima e do chão pelo terreno.
const SKY: Record<string, string> = {
  'Sol forte': '#FDE68A', 'Sol extremo': '#FDBA74', Chuva: '#93C5FD', 'Chuva torrencial': '#60A5FA',
  'Tempestade de areia': '#E7D3A1', Neve: '#E0F2FE', Granizo: '#E0F2FE',
};
const GROUND: Record<string, string> = {
  'Grassy Terrain': '#BBF7D0', 'Electric Terrain': '#FEF08A', 'Psychic Terrain': '#F5D0FE', 'Misty Terrain': '#FBCFE8',
};

function hpColor(ratio: number): 'success' | 'warning' | 'error' {
  return ratio > 0.5 ? 'success' : ratio > 0.2 ? 'warning' : 'error';
}

function Slot({ pokemon, own, images }: { pokemon: FieldPokemon | null; own: boolean; images: Images }) {
  if (!pokemon || pokemon.status === 'fnt') {
    return <Box sx={{ flex: 1, minHeight: 150 }} />;
  }
  const ratio = pokemon.hp / pokemon.maxHp;
  const boosts = Object.entries(pokemon.boosts).filter(([, value]) => value !== 0);

  return (
    <Stack key={pokemon.species} className="pop-in" alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
      <Paper variant="outlined" sx={{ px: 1.5, py: 1, width: '100%', maxWidth: 240 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
          <Typography variant="body2" fontWeight={700} noWrap>
            {pokemon.species}
          </Typography>
          {pokemon.status && <Chip size="small" color="warning" label={STATUS_LABEL[pokemon.status] ?? pokemon.status} />}
        </Stack>
        <LinearProgress
          variant="determinate"
          value={ratio * 100}
          color={hpColor(ratio)}
          aria-label={`HP de ${pokemon.species}`}
          sx={{ height: 8, borderRadius: 4, mt: 0.5, '& .MuiLinearProgress-bar': { transition: 'transform .6s ease' } }}
        />
        <Typography variant="caption" color="text.secondary" fontFamily="monospace">
          {own ? `${pokemon.hp}/${pokemon.maxHp}` : `${Math.round(ratio * 100)}%`}
        </Typography>

        {(boosts.length > 0 || pokemon.volatiles.length > 0) && (
          <Stack direction="row" gap={0.5} flexWrap="wrap" mt={0.5}>
            {boosts.map(([stat, value]) => (
              <Chip
                key={stat}
                size="small"
                color={value > 0 ? 'success' : 'error'}
                label={`${BOOST_LABEL[stat] ?? stat} ${value > 0 ? '+' : ''}${value}`}
                sx={{ height: 20, fontSize: 11 }}
              />
            ))}
            {pokemon.volatiles.map((effect) => (
              <Chip key={effect} size="small" variant="outlined" label={effect} sx={{ height: 20, fontSize: 11 }} />
            ))}
          </Stack>
        )}
      </Paper>
      <Box mt={0.5}>
        <PokemonSprite species={pokemon.species} images={images} back={own} height={96} />
      </Box>
    </Stack>
  );
}

function SideConditions({ label, conditions }: { label: string; conditions: string[] }) {
  if (conditions.length === 0) return null;
  return (
    <Stack direction="row" gap={0.5} alignItems="center" flexWrap="wrap" my={0.5}>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        {label}:
      </Typography>
      {conditions.map((condition) => (
        <Chip key={condition} size="small" color="secondary" label={condition} sx={{ height: 20, fontSize: 11 }} />
      ))}
    </Stack>
  );
}

export function BattleField({ field, images }: { field: Field; images: Images }) {
  const terrain = field.field.find((effect) => effect.endsWith('Terrain'));
  const row = (positions: Position[], own: boolean) => (
    <Stack direction="row" gap={2}>
      {positions.map((position) => (
        <Slot key={position} pokemon={field.active[position]} own={own} images={images} />
      ))}
    </Stack>
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        background: `linear-gradient(180deg, ${SKY[field.weather ?? ''] ?? '#DBEAFE'} 0%, #F8FAFC 50%, ${GROUND[terrain ?? ''] ?? '#DCFCE7'} 100%)`,
        transition: 'background .6s',
      }}
    >
      <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center" mb={1}>
        {field.turn > 0 && <Chip size="small" label={`Turno ${field.turn}`} />}
        <Chip size="small" color={field.weather ? 'info' : 'default'} variant={field.weather ? 'filled' : 'outlined'} label={`Clima: ${field.weather ?? 'nenhum'}`} />
        {field.field.map((effect) => (
          <Chip key={effect} size="small" color="primary" label={effect} />
        ))}
      </Stack>

      <SideConditions label="Lado do oponente" conditions={field.sides.p2} />
      {row(['p2a', 'p2b'], false)}
      <Box my={1} />
      {row(['p1a', 'p1b'], true)}
      <SideConditions label="Seu lado" conditions={field.sides.p1} />
    </Paper>
  );
}
