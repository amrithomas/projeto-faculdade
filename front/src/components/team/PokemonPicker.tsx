import { useEffect, useState } from 'react';
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      fetchPokemons({ search: input || undefined, per_page: 24 })
        .then((res) => {
          if (!cancelled) setOptions(res.data);
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
        setInput(reason === 'input' ? value : '');
      }}
      onChange={(_, pokemon) => {
        if (pokemon) onSelect(pokemon);
      }}
      filterOptions={(x) => x}
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
