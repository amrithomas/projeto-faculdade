import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import type { TeamPokemon, VgcRules } from '../../types/team';
import { damageMultiplier, formatName } from '../../utils/vgc';
import { TypeBadge } from '../TypeBadge';

const CELL_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  '4': { label: '4×', color: '#fff', bg: '#B91C1C' },
  '2': { label: '2×', color: '#fff', bg: '#EF4444' },
  '0.5': { label: '½', color: '#fff', bg: '#16A34A' },
  '0.25': { label: '¼', color: '#fff', bg: '#15803D' },
  '0': { label: '0', color: '#fff', bg: '#334155' },
};

/**
 * Cobertura defensiva: quanto dano cada membro recebe de cada tipo atacante,
 * e quantos membros são fracos / resistem a cada tipo.
 */
export function TeamCoverage({ team, rules }: { team: TeamPokemon[]; rules: VgcRules }) {
  const attackTypes = Object.keys(rules.type_chart);
  const slots = Array.from({ length: rules.team_size }, (_, i) => team[i]);

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h6" fontWeight={700}>
        Cobertura defensiva
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Multiplicador de dano que cada pokémon do time recebe de cada tipo de golpe.
      </Typography>

      <TableContainer>
        <Table size="small" sx={{ '& td, & th': { textAlign: 'center', px: 0.5 } }}>
          <TableHead>
            <TableRow>
              <TableCell>Tipo</TableCell>
              {slots.map((p, i) =>
                <TableCell key={i} sx={{ minWidth: 56 }}>
                  {p?.sprite_url ? (
                    <Box component="img" src={p.sprite_url} alt={formatName(p.name)} title={formatName(p.name)} sx={{ width: 40, height: 40 }} />
                  ) : (
                    <Typography variant="caption" color="text.disabled">Slot {i + 1}</Typography>
                  )}
                </TableCell>
              )}
              <TableCell sx={{ fontWeight: 700 }}>Fracos</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Resistem</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {attackTypes.map((attack) => {
              const multipliers = team.map((p) => damageMultiplier(attack, p.types, rules.type_chart));
              const weak = multipliers.filter((m) => m > 1).length;
              const resist = multipliers.filter((m) => m < 1).length;
              return (
                <TableRow key={attack} hover>
                  <TableCell>
                    <TypeBadge type={attack} />
                  </TableCell>
                  {slots.map((p, i) => {
                    const style = p && CELL_STYLE[String(multipliers[i])];
                    return (
                      <TableCell key={i}>
                        {style ? (
                          <Box
                            component="span"
                            sx={{ display: 'inline-block', minWidth: 32, borderRadius: 1, fontWeight: 700, fontSize: 13, color: style.color, bgcolor: style.bg }}
                          >
                            {style.label}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.disabled">–</Typography>
                        )}
                      </TableCell>
                    );
                  })}
                  {/* Mais fracos que resistentes a um tipo = ponto fraco do time. */}
                  <TableCell sx={{ fontWeight: 700, color: weak > resist ? 'error.main' : 'text.secondary' }}>{weak}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: resist > 0 ? 'success.main' : 'text.secondary' }}>{resist}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
