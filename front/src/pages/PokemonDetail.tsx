import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import MuiLink from '@mui/material/Link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MaleIcon from '@mui/icons-material/Male';
import FemaleIcon from '@mui/icons-material/Female';
import { fetchPokemon } from '../api/pokemon';
import type { PokemonDetail as PokemonDetailType } from '../types/pokemon';
import { TypeBadge } from '../components/TypeBadge';
import { EvolutionChain } from '../components/EvolutionChain';
import { MovesTable } from '../components/MovesTable';
import { TypeEffectivenessPanel } from '../components/TypeEffectivenessPanel';
import { FavoriteButton } from '../components/FavoriteButton';

const STAT_LABELS: Record<string, string> = {
  hp: 'PS',
  attack: 'Ataque',
  defense: 'Defesa',
  'special-attack': 'Ataque Esp.',
  'special-defense': 'Defesa Esp.',
  speed: 'Velocidade',
};

export function PokemonDetail() {
  const { id } = useParams<{ id: string }>();
  const [pokemon, setPokemon] = useState<PokemonDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchPokemon(id)
      .then(setPokemon)
      .catch(() => setError('Pokémon não encontrado.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !pokemon) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const hasGender = !!pokemon.gender && (pokemon.gender.male || pokemon.gender.female);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <MuiLink
        component={Link}
        to="/"
        underline="hover"
        variant="body2"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
      >
        <ArrowBackIcon fontSize="inherit" /> Voltar para a Pokédex
      </MuiLink>

      <Card variant="outlined" sx={{ mt: 2, overflow: 'hidden' }}>
        <Box
          sx={{
            p: 3,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="caption" fontFamily="monospace" color="text.secondary">
              Nº {String(pokemon.pokedex_number).padStart(4, '0')}
              {pokemon.region && (
                <>
                  {' '}
                  · {pokemon.region}
                  {pokemon.regional_dex_number
                    ? ` Nº ${String(pokemon.regional_dex_number).padStart(4, '0')}`
                    : ''}
                </>
              )}
            </Typography>
            <Typography variant="h4" fontWeight={700} textTransform="capitalize">
              {pokemon.name}
            </Typography>
          </Box>
          <FavoriteButton key={pokemon.id} pokemonId={pokemon.id} isFavorited={pokemon.is_favorited} />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '260px 1fr' },
            gap: 3,
            p: 3,
          }}
        >
          {/* Coluna esquerda: imagem + estatísticas */}
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ bgcolor: 'grey.100', p: 2, textAlign: 'center' }}>
              {pokemon.sprite_url ? (
                <Box
                  component="img"
                  src={pokemon.sprite_url}
                  alt={pokemon.name}
                  sx={{ width: '100%', maxWidth: 200, height: 'auto', mx: 'auto', display: 'block' }}
                />
              ) : (
                <Box sx={{ width: 200, height: 200, mx: 'auto', bgcolor: 'grey.300', borderRadius: 1 }} />
              )}
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="overline" color="text.secondary">
                Estatísticas
              </Typography>
              <Stack spacing={1.25} mt={1}>
                {pokemon.stats.map((stat) => (
                  <Box key={stat.name}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        {STAT_LABELS[stat.name] ?? stat.name}
                      </Typography>
                      <Typography variant="caption" fontFamily="monospace" fontWeight={600}>
                        {stat.base_value}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, (stat.base_value / 255) * 100)}
                      sx={{ height: 6, borderRadius: 3, mt: 0.5 }}
                    />
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Stack>

          {/* Coluna direita: descrição, ficha, tipo, fraquezas */}
          <Box>
            {pokemon.description && (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                {pokemon.description}
              </Typography>
            )}

            <Paper sx={{ mt: 2, p: 2, bgcolor: '#30a7d7', color: 'primary.contrastText' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 1.5, columnGap: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Altura
                  </Typography>
                  <Typography fontWeight={600}>{pokemon.height ?? '?'} m</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Categoria
                  </Typography>
                  <Typography fontWeight={600}>{pokemon.genus ?? '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Peso
                  </Typography>
                  <Typography fontWeight={600}>{pokemon.weight ?? '?'} kg</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Habilidades
                  </Typography>
                  <Stack spacing={0.25} mt={0.25}>
                    {pokemon.abilities.map((ability) => (
                      <Typography
                        key={ability.name}
                        fontWeight={600}
                        textTransform="capitalize"
                        fontSize={14}
                      >
                        {ability.name.replace(/-/g, ' ')}
                        {ability.is_hidden && (
                          <Typography component="span" variant="caption" sx={{ opacity: 0.75 }}>
                            {' '}
                            (oculta)
                          </Typography>
                        )}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
                {hasGender && (
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      Sexo
                    </Typography>
                    <Stack direction="row" spacing={1} mt={0.25}>
                      {pokemon.gender!.male && <MaleIcon fontSize="small" />}
                      {pokemon.gender!.female && <FemaleIcon fontSize="small" />}
                    </Stack>
                  </Box>
                )}
              </Box>
            </Paper>

            <Box mt={2.5}>
              <Typography variant="overline" color="text.secondary">
                Tipo
              </Typography>
              <Stack direction="row" spacing={1} mt={0.5}>
                {pokemon.types.map((type) => (
                  <TypeBadge key={type} type={type} />
                ))}
              </Stack>
            </Box>

            <TypeEffectivenessPanel effectiveness={pokemon.type_effectiveness} />
          </Box>
        </Box>

        <Box sx={{ px: 3, pb: 3 }}>
          <EvolutionChain stages={pokemon.evolution_family} currentId={pokemon.id} />
          <MovesTable moves={pokemon.moves} />
        </Box>
      </Card>
    </Container>
  );
}
