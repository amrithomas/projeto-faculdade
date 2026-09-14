import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useAuthStore } from '../store/authStore';
import { fetchFavorites } from '../api/favorites';
import type { PokemonSummary } from '../types/pokemon';
import { PokemonCard } from '../components/PokemonCard';
import { Pagination } from '../components/Pagination';

export function Profile() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [page, setPage] = useState(1);
  const [pokemons, setPokemons] = useState<PokemonSummary[]>([]);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    fetchFavorites(page)
      .then((res) => {
        setPokemons(res.data);
        setLastPage(res.meta.last_page);
      })
      .catch(() => setError('Não foi possível carregar seus favoritos.'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, page]);

  // Sem sessão, manda pro login em vez de mostrar uma tela vazia/quebrada.
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Se o pokémon deixou de ser favorito (clicou no coração aqui mesmo),
  // some da lista na hora, sem esperar recarregar a página.
  function handleFavoriteToggled(pokemonId: number, favorited: boolean) {
    if (!favorited) {
      setPokemons((prev) => prev.filter((p) => p.id !== pokemonId));
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" spacing={2} alignItems="center" mb={4}>
        <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 24 }}>
          {user.username[0]?.toUpperCase()}
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {user.username}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Pokémons favoritados
          </Typography>
        </Box>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" mt={6}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {pokemons.length === 0 && !error ? (
            <Alert severity="info">Você ainda não favoritou nenhum pokémon.</Alert>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(3, 1fr)',
                  md: 'repeat(4, 1fr)',
                  lg: 'repeat(5, 1fr)',
                },
              }}
            >
              {pokemons.map((pokemon) => (
                <PokemonCard
                  key={pokemon.id}
                  pokemon={pokemon}
                  onFavoriteToggled={(favorited) => handleFavoriteToggled(pokemon.id, favorited)}
                />
              ))}
            </Box>
          )}
          <Pagination currentPage={page} lastPage={lastPage} onChange={setPage} />
        </>
      )}
    </Container>
  );
}
