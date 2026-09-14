import Chip from '@mui/material/Chip';
import { typeColor, typeTextColor } from '../utils/typeColors';

export function TypeBadge({ type }: { type: string }) {
  return (
    <Chip
      label={type}
      size="small"
      sx={{
        bgcolor: typeColor(type),
        color: typeTextColor(type),
        fontWeight: 600,
        textTransform: 'capitalize',
      }}
    />
  );
}
