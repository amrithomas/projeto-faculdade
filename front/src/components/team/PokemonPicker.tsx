import { type UIEvent, useEffect, useRef, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { fetchPokemons } from '../../api/pokemon';
import type { PokemonSummary } from '../../types/pokemon';
import type { VgcRules } from '../../types/team';
import { banReason, formatName } from '../../utils/vgc';
import { TypeBadge } from '../TypeBadge';

const PER_PAGE = 24;

/**
 * Busca de pokémon pelo nome (na API, com debounce), usada pra adicionar
 * ou trocar um membro do time. Opções que quebrariam as regras (Species
 * Clause, restritos/míticos/lendários) aparecem desabilitadas com o motivo.
 */
export function PokemonPicker({
  rules,
  takenPokedexNumbers,
  restrictedInTeam,
  onSelect,
  label = 'Adicionar pokémon',
}: {
  rules: VgcRules;
  takenPokedexNumbers: number[];
  restrictedInTeam: number;
  onSelect: (pokemon: PokemonSummary) => void;
  label?: string;
}) {
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<PokemonSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  // Busca atual, pra descartar uma página que chegou depois de outra digitação.
  const inputRef = useRef(input);

  // Busca nova: volta pra página 1 (com debounce enquanto digita).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      fetchPokemons({ search: input || undefined, with_megas: true, per_page: PER_PAGE, page: 1 })
        .then((res) => {
          if (cancelled) return;
          setOptions(res.data);
          setPage(1);
          setLastPage(res.meta.last_page);
        })
        .catch(() => {
          if (!cancelled) setOptions([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [input]);

  // Rolagem infinita: perto do fim da lista, carrega a próxima página.
  function loadMore(event: UIEvent<HTMLElement>) {
    const list = event.currentTarget;
    if (loading || page >= lastPage || list.scrollTop + list.clientHeight < list.scrollHeight - 80) return;

    const searchAtRequest = input;
    setLoading(true);
    fetchPokemons({ search: input || undefined, with_megas: true, per_page: PER_PAGE, page: page + 1 })
      .then((res) => {
        // Se o usuário digitou outra coisa nesse meio tempo, a página é de outra busca.
        if (searchAtRequest !== inputRef.current) return;
        setOptions((prev) => [...prev, ...res.data]);
        setPage(res.meta.current_page);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  function disabledReason(pokemon: PokemonSummary): string | null {
    if (takenPokedexNumbers.includes(pokemon.pokedex_number)) {
      return 'Já está no time';
    }
    return banReason(pokemon, rules, restrictedInTeam);
  }

  return (
    <Autocomplete
      options={options}
      loading={loading}
      value={null}
      inputValue={input}
      onInputChange={(_, value, reason) => {
        // Só guarda o que o usuário digitou; depois de escolher um pokémon
        // (ou sair do campo), limpa em vez de deixar o nome lá.
        inputRef.current = reason === 'input' ? value : '';
        setInput(inputRef.current);
      }}
      onChange={(_, pokemon) => {
        if (pokemon) onSelect(pokemon);
      }}
      filterOptions={(x) => x}
      slotProps={{ listbox: { onScroll: loadMore } }}
      getOptionLabel={(p) => p.name}
      getOptionDisabled={(p) => disabledReason(p) !== null}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      noOptionsText="Nenhum pokémon encontrado"
      loadingText="Buscando..."
      renderOption={({ key, ...props }, pokemon) => {
        const reason = disabledReason(pokemon);
        return (
          <Box component="li" key={key} {...props} sx={{ gap: 1.5 }}>
            {pokemon.sprite_url && (
              <Box component="img" src={pokemon.sprite_url} alt="" sx={{ width: 40, height: 40 }} />
            )}
            <Box flex={1} minWidth={0}>
              <Typography variant="body2" fontWeight={600} textTransform="capitalize">
                {formatName(pokemon.name)}{' '}
                <Typography component="span" variant="caption" color="text.secondary" fontFamily="monospace">
                  #{String(pokemon.pokedex_number).padStart(4, '0')}
                </Typography>
              </Typography>
              <Stack direction="row" spacing={0.5} mt={0.25}>
                {pokemon.types.map((type) => (
                  <TypeBadge key={type} type={type} />
                ))}
              </Stack>
            </Box>
            {reason && (
              <Typography variant="caption" color="error">
                {reason}
              </Typography>
            )}
          </Box>
        );
      }}
      renderInput={(params) => <TextField {...params} label={label} placeholder="Digite o nome..." />}
    />
  );
}
