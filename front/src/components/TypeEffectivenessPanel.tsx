import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import type { TypeEffectiveness } from '../types/pokemon';
import { TypeBadge } from './TypeBadge';

function formatMultiplier(multiplier: number): string {
  return `x${multiplier % 1 === 0 ? multiplier : multiplier.toFixed(2)}`;
}

export function TypeEffectivenessPanel({ effectiveness }: { effectiveness: TypeEffectiveness }) {
  const weak = Object.entries(effectiveness.weak_against).sort((a, b) => b[1] - a[1]);
  const resistant = Object.entries(effectiveness.resistant_to).sort((a, b) => a[1] - b[1]);
  const immune = effectiveness.immune_to;

  if (weak.length === 0 && resistant.length === 0 && immune.length === 0) {
    return null;
  }

  return (
    <Box width="100%" mt={3}>
      <Typography variant="overline" color="text.secondary">
        Fraquezas e resistências
      </Typography>

      {weak.length > 0 && (
        <Box mt={1}>
          <Typography variant="body2" color="text.secondary">
            Recebe mais dano de
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={0.5}>
            {weak.map(([type, multiplier]) => (
              <Stack key={type} direction="row" spacing={0.5} alignItems="center">
                <TypeBadge type={type} />

              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      {resistant.length > 0 && (
        <Box mt={1.5}>
          <Typography variant="body2" color="text.secondary">
            Recebe menos dano de
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={0.5}>
            {resistant.map(([type, multiplier]) => (
              <Stack key={type} direction="row" spacing={0.5} alignItems="center">
                <TypeBadge type={type} />
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      {immune.length > 0 && (
        <Box mt={1.5}>
          <Typography variant="body2" color="text.secondary">
            Imune a
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={0.5}>
            {immune.map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
