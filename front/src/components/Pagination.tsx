import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface Props {
  currentPage: number;
  lastPage: number;
  onChange: (page: number) => void;
}

export function Pagination({ currentPage, lastPage, onChange }: Props) {
  if (lastPage <= 1) return null;

  const isFirst = currentPage <= 1;
  const isLast = currentPage >= lastPage;

  return (
    <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" mt={4}>
      <Button
        variant="outlined"
        startIcon={<ArrowBackIcon />}
        disabled={isFirst}
        onClick={() => onChange(currentPage - 1)}
      >
        Anterior
      </Button>

      <Typography variant="body2" color="text.secondary" fontFamily="monospace" minWidth={110} textAlign="center">
        Página {currentPage} de {lastPage}
      </Typography>

      <Button
        variant="outlined"
        endIcon={<ArrowForwardIcon />}
        disabled={isLast}
        onClick={() => onChange(currentPage + 1)}
      >
        Próxima
      </Button>
    </Stack>
  );
}
