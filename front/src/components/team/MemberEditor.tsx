import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Autocomplete from '@mui/material/Autocomplete';
import Slider from '@mui/material/Slider';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { fetchLearnset } from '../../api/teams';
import type { Item, Learnset, LearnsetMove, StatName, StatPoints, TeamPokemon, VgcRules } from '../../types/team';
import {
  STAT_SHORT_LABELS,
  calcStat,
  formatName,
  natureLabel,
  totalStatPoints,
} from '../../utils/vgc';
import { TypeBadge } from '../TypeBadge';

export interface MemberDraft {
  // Chave estável pro React (o membro ainda pode não ter id no back).
  key: string;
  pokemon: TeamPokemon;
  ability_id: number | null;
  item_id: number | null;
  nature: string;
  stat_points: StatPoints;
  // Sempre com `max_moves` posições; null = slot de golpe vazio.
  move_ids: (number | null)[];
}

const DAMAGE_CLASS_LABEL: Record<string, string> = {
  physical: 'Físico',
  special: 'Especial',
  status: 'Status',
};

const LEARN_METHOD_LABEL: Record<string, string> = {
  'level-up': 'Level up',
  machine: 'TM',
  tutor: 'Tutor',
  egg: 'Egg move',
  reminder: 'Evolução / Lembrete',
};

export function MemberEditor({
  member,
  rules,
  items,
  usedItemIds,
  errors,
  onChange,
  onRemove,
}: {
  member: MemberDraft;
  rules: VgcRules;
  items: Item[];
  // Itens já usados pelos outros membros (Item Clause).
  usedItemIds: number[];
  // Erros do back só deste membro, com a chave relativa (ex: "item_id").
  errors: Record<string, string[]>;
  onChange: (member: MemberDraft) => void;
  onRemove: () => void;
}) {
  const [learnset, setLearnset] = useState<Learnset | null>(null);
  const [learnsetError, setLearnsetError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLearnset(null);
    setLearnsetError(false);
    fetchLearnset(member.pokemon.id)
      .then((data) => {
        if (!cancelled) setLearnset(data);
      })
      .catch(() => {
        if (!cancelled) setLearnsetError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [member.pokemon.id]);

  const nature = rules.natures[member.nature];
  const usedPoints = totalStatPoints(member.stat_points);
  const remainingPoints = rules.stat_points.total - usedPoints;
  const selectedItem = items.find((item) => item.id === member.item_id) ?? null;

  function fieldErrors(prefix: string): string[] {
    return Object.entries(errors)
      .filter(([key]) => key === prefix || key.startsWith(`${prefix}.`))
      .flatMap(([, messages]) => messages);
  }

  function setStatPoints(stat: StatName, value: number) {
    // Nunca deixa passar do limite por stat nem do total.
    const others = usedPoints - member.stat_points[stat];
    const capped = Math.max(
      0,
      Math.min(value, rules.stat_points.per_stat, rules.stat_points.total - others),
    );
    onChange({ ...member, stat_points: { ...member.stat_points, [stat]: capped } });
  }

  function setMove(index: number, move: LearnsetMove | null) {
    const move_ids = [...member.move_ids];
    move_ids[index] = move?.id ?? null;
    onChange({ ...member, move_ids });
  }

  const baseStat = (stat: StatName) =>
    member.pokemon.stats.find((s) => s.name === stat)?.base_value ?? 0;

  const pokemonErrors = fieldErrors('pokemon_id');
  const statErrors = fieldErrors('stat_points');
  const moveErrors = fieldErrors('move_ids');

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack direction="row" spacing={2} alignItems="center" mb={2}>
        {member.pokemon.sprite_url && (
          <Box component="img" src={member.pokemon.sprite_url} alt="" sx={{ width: 72, height: 72 }} />
        )}
        <Box flex={1} minWidth={0}>
          <Typography variant="h6" fontWeight={700} textTransform="capitalize">
            {formatName(member.pokemon.name)}
          </Typography>
          <Stack direction="row" spacing={0.5} mt={0.5}>
            {member.pokemon.types.map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
          </Stack>
        </Box>
        <Button color="error" startIcon={<DeleteOutlineIcon />} onClick={onRemove}>
          Remover
        </Button>
      </Stack>

      {pokemonErrors.map((message) => (
        <Alert key={message} severity="error" sx={{ mb: 2 }}>
          {message}
        </Alert>
      ))}

      {learnsetError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Não foi possível carregar habilidades e golpes deste pokémon.
        </Alert>
      )}

      {!learnset && !learnsetError ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          }}
        >
          {/* Coluna esquerda: habilidade, item, natureza, golpes */}
          <Stack spacing={2}>
            <TextField
              select
              label="Habilidade"
              value={member.ability_id ?? ''}
              onChange={(e) => onChange({ ...member, ability_id: Number(e.target.value) })}
              error={fieldErrors('ability_id').length > 0}
              helperText={
                fieldErrors('ability_id')[0] ??
                learnset?.abilities.find((a) => a.id === member.ability_id)?.description
              }
            >
              {learnset?.abilities.map((ability) => (
                <MenuItem key={ability.id} value={ability.id} sx={{ textTransform: 'capitalize' }}>
                  {formatName(ability.name)}
                  {ability.is_hidden && ' (oculta)'}
                </MenuItem>
              ))}
            </TextField>

            <Autocomplete
              options={items}
              value={selectedItem}
              onChange={(_, item) => onChange({ ...member, item_id: item?.id ?? null })}
              getOptionLabel={(item) => formatName(item.name)}
              getOptionDisabled={(item) => usedItemIds.includes(item.id)}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              noOptionsText="Nenhum item encontrado"
              renderOption={({ key, ...props }, item) => (
                <Box component="li" key={key} {...props} sx={{ gap: 1, textTransform: 'capitalize' }}>
                  {item.sprite_url && (
                    <Box component="img" src={item.sprite_url} alt="" sx={{ width: 24, height: 24 }} />
                  )}
                  <Box flex={1}>{formatName(item.name)}</Box>
                  {usedItemIds.includes(item.id) && (
                    <Typography variant="caption" color="text.secondary" textTransform="none">
                      já usado
                    </Typography>
                  )}
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Item (opcional)"
                  error={fieldErrors('item_id').length > 0}
                  helperText={fieldErrors('item_id')[0] ?? selectedItem?.description ?? 'Item Clause: cada item só pode aparecer uma vez no time.'}
                />
              )}
            />

            <TextField
              select
              label="Natureza"
              value={member.nature}
              onChange={(e) => onChange({ ...member, nature: e.target.value })}
              error={fieldErrors('nature').length > 0}
              helperText={fieldErrors('nature')[0]}
              sx={{ textTransform: 'capitalize' }}
            >
              {Object.entries(rules.natures).map(([name, n]) => (
                <MenuItem key={name} value={name} sx={{ textTransform: 'capitalize' }}>
                  {natureLabel(name, n)}
                </MenuItem>
              ))}
            </TextField>

            <Box>
              <Typography variant="overline" color="text.secondary">
                Golpes
              </Typography>
              <Stack spacing={1.5} mt={0.5}>
                {member.move_ids.map((moveId, index) => {
                  const selected = learnset?.moves.find((m) => m.id === moveId) ?? null;
                  const takenByOthers = member.move_ids.filter((id, i) => i !== index && id !== null);
                  return (
                    <Autocomplete
                      key={index}
                      size="small"
                      options={learnset?.moves ?? []}
                      value={selected}
                      onChange={(_, move) => setMove(index, move)}
                      getOptionLabel={(move) => formatName(move.name)}
                      getOptionDisabled={(move) => takenByOthers.includes(move.id)}
                      isOptionEqualToValue={(a, b) => a.id === b.id}
                      noOptionsText="Nenhum golpe encontrado"
                      renderOption={({ key, ...props }, move) => (
                        <Box component="li" key={key} {...props} sx={{ gap: 1 }}>
                          <Box flex={1} minWidth={0}>
                            <Typography variant="body2" fontWeight={500} textTransform="capitalize">
                              {formatName(move.name)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {move.damage_class ? DAMAGE_CLASS_LABEL[move.damage_class] : '—'}
                              {move.power ? ` · ${move.power} pod.` : ''}
                              {move.accuracy ? ` · ${move.accuracy}%` : ''}
                              {` · ${LEARN_METHOD_LABEL[move.learn_method] ?? move.learn_method}`}
                            </Typography>
                          </Box>
                          {move.type && <TypeBadge type={move.type} />}
                        </Box>
                      )}
                      renderInput={(params) => (
                        <TextField {...params} label={`Golpe ${index + 1}`} error={moveErrors.length > 0} />
                      )}
                    />
                  );
                })}
              </Stack>
              {moveErrors.map((message) => (
                <Typography key={message} variant="caption" color="error" display="block" mt={0.5}>
                  {message}
                </Typography>
              ))}
            </Box>
          </Stack>

          {/* Coluna direita: stat points e stats finais */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
              <Typography variant="overline" color="text.secondary">
                Stat points
              </Typography>
              <Typography
                variant="caption"
                fontFamily="monospace"
                color={remainingPoints === 0 ? 'success.main' : 'text.secondary'}
              >
                {usedPoints}/{rules.stat_points.total} usados
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Nível {rules.level} · IVs fixos em {rules.iv} · máx. {rules.stat_points.per_stat} por stat
            </Typography>

            <Stack spacing={0.5}>
              {rules.stats.map((stat) => {
                const base = baseStat(stat);
                const points = member.stat_points[stat];
                const final = calcStat(stat, base, points, nature, rules);
                const boosted = nature?.increased === stat;
                const lowered = nature?.decreased === stat;
                return (
                  <Box
                    key={stat}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '64px 32px 1fr 56px 40px',
                      alignItems: 'center',
                      columnGap: 1.5,
                    }}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      color={boosted ? 'error.main' : lowered ? 'info.main' : 'text.primary'}
                    >
                      {STAT_SHORT_LABELS[stat]}
                      {boosted && ' ↑'}
                      {lowered && ' ↓'}
                    </Typography>
                    <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                      {base}
                    </Typography>
                    <Slider
                      size="small"
                      min={0}
                      max={rules.stat_points.per_stat}
                      value={points}
                      onChange={(_, value) => setStatPoints(stat, value as number)}
                      aria-label={`Stat points de ${STAT_SHORT_LABELS[stat]}`}
                    />
                    <TextField
                      size="small"
                      type="number"
                      value={points}
                      onChange={(e) => setStatPoints(stat, Number(e.target.value) || 0)}
                      slotProps={{ htmlInput: { min: 0, max: rules.stat_points.per_stat, style: { padding: '4px 6px' } } }}
                    />
                    <Typography variant="body2" fontFamily="monospace" fontWeight={700} textAlign="right">
                      {final}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>

            {statErrors.map((message) => (
              <Typography key={message} variant="caption" color="error" display="block" mt={1}>
                {message}
              </Typography>
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  );
}
