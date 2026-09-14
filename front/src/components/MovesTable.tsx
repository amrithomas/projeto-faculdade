import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import type { PokemonMove } from '../types/pokemon';
import { TypeBadge } from './TypeBadge';

const DAMAGE_CLASS_LABEL: Record<string, string> = {
  physical: 'Físico',
  special: 'Especial',
  status: 'Status',
};

export function MovesTable({ moves }: { moves: PokemonMove[] }) {
  if (moves.length === 0) return null;

  return (
    <Box width="100%" mt={3}>
      <Typography variant="overline" color="text.secondary">
        Golpes aprendidos (level up)
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mt: 0.5 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nv.</TableCell>
              <TableCell>Golpe</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell>Dano</TableCell>
              <TableCell>Precisão</TableCell>
              <TableCell>Descrição</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {moves.map((move) => (
              <TableRow key={move.name} hover>
                <TableCell sx={{ fontFamily: 'monospace' }}>{move.level ?? '-'}</TableCell>
                <TableCell sx={{ textTransform: 'capitalize', fontWeight: 500 }}>
                  {move.name.replace(/-/g, ' ')}
                </TableCell>
                <TableCell>{move.type && <TypeBadge type={move.type} />}</TableCell>
                <TableCell>
                  {move.damage_class ? (DAMAGE_CLASS_LABEL[move.damage_class] ?? move.damage_class) : '-'}
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{move.power ?? '-'}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>
                  {move.accuracy ? `${move.accuracy}%` : '-'}
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', maxWidth: 280 }}>
                  {move.description ?? '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
