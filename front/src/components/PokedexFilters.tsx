import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import type { Region } from '../types/pokemon';

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  type: string;
  onTypeChange: (value: string) => void;
  types: string[];
  region: string;
  onRegionChange: (value: string) => void;
  regions: Region[];
  perPage: number;
  onPerPageChange: (value: number) => void;
}

const PER_PAGE_OPTIONS = [24, 48, 96, 150];

export function PokedexFilters({
  search,
  onSearchChange,
  type,
  onTypeChange,
  types,
  region,
  onRegionChange,
  regions,
  perPage,
  onPerPageChange,
}: Props) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
      <TextField
        size="small"
        label="Buscar por nome"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ minWidth: 220 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      <TextField
        select
        size="small"
        label="Tipo"
        value={type}
        onChange={(e) => onTypeChange(e.target.value)}
        sx={{ minWidth: 170 }}
      >
        <MenuItem value="">Todos os tipos</MenuItem>
        {types.map((t) => (
          <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>
            {t}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Região"
        value={region}
        onChange={(e) => onRegionChange(e.target.value)}
        sx={{ minWidth: 240 }}
      >
        <MenuItem value="">Dex nacional (todas as regiões)</MenuItem>
        {regions.map((r) => (
          <MenuItem key={r.name} value={r.name} sx={{ textTransform: 'capitalize' }}>
            {r.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Itens por página"
        value={perPage}
        onChange={(e) => onPerPageChange(Number(e.target.value))}
        sx={{ minWidth: 170 }}
      >
        {PER_PAGE_OPTIONS.map((n) => (
          <MenuItem key={n} value={n}>
            {n} por página
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}
