import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useAuthStore } from '../store/authStore';
import { deleteTeam, fetchTeams } from '../api/teams';
import type { Team } from '../types/team';
import { formatName } from '../utils/vgc';

const TEAM_SIZE = 6;

export function Teams() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Team | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    fetchTeams()
      .then(setTeams)
      .catch(() => setError('Não foi possível carregar seus times.'))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteTeam(toDelete.id);
      setTeams((prev) => prev.filter((t) => t.id !== toDelete.id));
      setToDelete(null);
    } catch {
      setError('Não foi possível excluir o time.');
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Meus times
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Times no formato VGC: 6 pokémons, nível 50, batalhas em duplas.
          </Typography>
        </Box>
        <Button component={Link} to="/teams/new" variant="contained" disableElevation startIcon={<AddIcon />}>
          Novo time
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" mt={6}>
          <CircularProgress />
        </Box>
      ) : teams.length === 0 && !error ? (
        <Alert severity="info">Você ainda não montou nenhum time.</Alert>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          }}
        >
          {teams.map((team) => (
            <Card key={team.id} variant="outlined" sx={{ position: 'relative' }}>
              <CardActionArea component={Link} to={`/teams/${team.id}`} sx={{ p: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" pr={4}>
                  <Typography variant="subtitle1" fontWeight={700} noWrap>
                    {team.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={team.is_complete ? 'Completo' : `Rascunho ${team.members.length}/${TEAM_SIZE}`}
                    color={team.is_complete ? 'success' : 'default'}
                  />
                </Stack>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${TEAM_SIZE}, 1fr)`,
                    gap: 0.5,
                    mt: 1.5,
                  }}
                >
                  {Array.from({ length: TEAM_SIZE }, (_, i) => {
                    const member = team.members[i];
                    return member?.pokemon.sprite_url ? (
                      <Box
                        key={member.id}
                        component="img"
                        src={member.pokemon.sprite_url}
                        alt={member.pokemon.name}
                        title={formatName(member.pokemon.name)}
                        loading="lazy"
                        sx={{ width: '100%', height: 'auto', aspectRatio: '1' }}
                      />
                    ) : (
                      <Box key={i} sx={{ aspectRatio: '1', bgcolor: 'grey.100', borderRadius: 1 }} />
                    );
                  })}
                </Box>
              </CardActionArea>
              <IconButton
                aria-label="Excluir time"
                size="small"
                onClick={() => setToDelete(team)}
                sx={{ position: 'absolute', top: 8, right: 8 }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={!!toDelete} onClose={() => !deleting && setToDelete(null)}>
        <DialogTitle>Excluir time?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            O time <strong>{toDelete?.name}</strong> será excluído permanentemente.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)} disabled={deleting}>
            Cancelar
          </Button>
          <Button color="error" onClick={confirmDelete} disabled={deleting}>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
