import { useEffect, useState } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { fetchPokemons, fetchRegions, fetchTypes } from '../api/pokemon';
import type { PokemonSummary, Region } from '../types/pokemon';
import { PokemonCard } from '../components/PokemonCard';
import { PokedexFilters } from '../components/PokedexFilters';
import { Pagination } from '../components/Pagination';

export function Pokedex() {
  const [pokemons, setPokemons] = useState<PokemonSummary[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [region, setRegion] = useState('');
  const [perPage, setPerPage] = useState(48);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listas de tipos e regiões pros filtros, carregadas uma única vez.
  useEffect(() => {
    fetchTypes()
      .then(setTypes)
      .catch(() => setTypes([]));
    fetchRegions()
      .then(setRegions)
      .catch(() => setRegions([]));
  }, []);

  // Sempre que busca, tipo, região ou itens-por-página mudam, volta pra página 1.
  useEffect(() => {
    setPage(1);
  }, [search, type, region, perPage]);

  // Busca a lista de pokémons com debounce na busca por nome.
  useEffect(() => {
    setLoading(true);
    setError(null);
    const timeout = setTimeout(() => {
      fetchPokemons({
        search: search || undefined,
        type: type || undefined,
        region: region || undefined,
        per_page: perPage,
        page,
      })
        .then((res) => {
          setPokemons(res.data);
          setLastPage(res.meta.last_page);
          setTotal(res.meta.total);
        })
        .catch(() => setError('Não foi possível carregar a Pokédex.'))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, type, region, perPage, page]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700}>
        Pokédex
      </Typography>
      <Typography variant="body1" color="text.secondary" mt={0.5}>
        Dados sincronizados da PokéAPI para o nosso banco{total > 0 ? ` · ${total} pokémons` : ''}.
      </Typography>

      <Box mt={3}>
        <PokedexFilters
          search={search}
          onSearchChange={setSearch}
          type={type}
          onTypeChange={setType}
          types={types}
          region={region}
          onRegionChange={setRegion}
          regions={regions}
          perPage={perPage}
          onPerPageChange={setPerPage}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" mt={6}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {pokemons.length === 0 && !error ? (
            <Typography align="center" color="text.disabled" mt={6}>
              Nenhum pokémon encontrado.
            </Typography>
          ) : (
            <Box
              mt={2}
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
              {pokemons.map((p) => (
                <PokemonCard key={p.id} pokemon={p} showRegionalNumber={!!region} />
              ))}
            </Box>
          )}
          <Pagination currentPage={page} lastPage={lastPage} onChange={setPage} />
        </>
      )}
    </Container>
  );
}
