import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import ButtonBase from '@mui/material/ButtonBase';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { EvolutionStagePokemon } from '../types/pokemon';
import { TypeBadge } from './TypeBadge';

function EvolutionMember({
  pokemon,
  isCurrent,
}: {
  pokemon: EvolutionStagePokemon;
  isCurrent: boolean;
}) {
  return (
    <ButtonBase
      component={Link}
      to={`/pokemon/${pokemon.id}`}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        p: 1,
        borderRadius: 2,
        bgcolor: isCurrent ? 'rgba(255,255,255,0.12)' : 'transparent',
      }}
    >
      <Typography variant="caption" color="grey.400" fontFamily="monospace">
        Nº {String(pokemon.pokedex_number).padStart(4, '0')}
      </Typography>
      <Avatar
        src={pokemon.sprite_url ?? undefined}
        alt={pokemon.name}
        sx={{
          width: 64,
          height: 64,
          bgcolor: 'grey.700',
          border: isCurrent ? '2px solid white' : '2px solid transparent',
        }}
      />
      <Typography variant="body2" fontWeight={600} color="common.white" textTransform="capitalize">
        {pokemon.name}
      </Typography>
      <Stack direction="row" spacing={0.5}>
        {pokemon.types.map((type) => (
          <TypeBadge key={type} type={type} />
        ))}
      </Stack>
    </ButtonBase>
  );
}

export function EvolutionChain({
  stages,
  currentId,
}: {
  stages: EvolutionStagePokemon[][];
  currentId: number;
}) {
  // Só um pokémon numa única etapa = não evolui de/para nada, não mostra nada.
  if (stages.length <= 1 && (stages[0]?.length ?? 0) <= 1) return null;

  return (
    <Box width="100%" mt={3}>
      <Typography variant="overline" color="text.secondary">
        Evoluções
      </Typography>
      <Paper sx={{ mt: 0.5, p: 2.5, bgcolor: 'grey.900', overflowX: 'auto' }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          justifyContent="center"
        >
          {stages.map((stage, stageIndex) => (
            <Stack key={stageIndex} direction="row" spacing={1} alignItems="center">
              {stageIndex > 0 && <ChevronRightIcon sx={{ color: 'grey.500' }} />}
              <Stack direction="row" spacing={1.5}>
                {stage.map((pokemon) => (
                  <EvolutionMember
                    key={pokemon.id}
                    pokemon={pokemon}
                    isCurrent={pokemon.id === currentId}
                  />
                ))}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}
