import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import ButtonBase from '@mui/material/ButtonBase';
import MuiLink from '@mui/material/Link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import { useAuthStore } from '../store/authStore';
import { createTeam, fetchItems, fetchLearnset, fetchTeam, fetchVgcRules, updateTeam } from '../api/teams';
import type { Item, Team, TeamPayload, VgcRules } from '../types/team';
import type { PokemonSummary } from '../types/pokemon';
import { PokemonPicker } from '../components/team/PokemonPicker';
import { MemberEditor, type MemberDraft } from '../components/team/MemberEditor';
import { emptyStatPoints, formatName, totalStatPoints } from '../utils/vgc';

type FieldErrors = Record<string, string[]>;

let draftCounter = 0;
const nextKey = () => `draft-${++draftCounter}`;

function padMoves(ids: number[], size: number): (number | null)[] {
  return [...ids, ...Array<null>(Math.max(0, size - ids.length)).fill(null)].slice(0, size);
}

function teamToDrafts(team: Team, rules: VgcRules): MemberDraft[] {
  return team.members.map((member) => ({
    key: nextKey(),
    pokemon: member.pokemon,
    ability_id: member.ability?.id ?? null,
    item_id: member.item?.id ?? null,
    nature: member.nature,
    stat_points: member.stat_points,
    move_ids: padMoves(
      member.moves.map((m) => m.id),
      rules.max_moves,
    ),
  }));
}

export function TeamBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [rules, setRules] = useState<VgcRules | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('');
  const [members, setMembers] = useState<MemberDraft[]>([]);
  const [selected, setSelected] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setLoadError(null);
    Promise.all([fetchVgcRules(), fetchItems(), id ? fetchTeam(id) : Promise.resolve(null)])
      .then(([rulesData, itemsData, team]) => {
        setRules(rulesData);
        setItems(itemsData);
        if (team) {
          setName(team.name);
          setMembers(teamToDrafts(team, rulesData));
        } else {
          setName('');
          setMembers([]);
        }
        setSelected(0);
      })
      .catch(() => setLoadError(id ? 'Time não encontrado.' : 'Não foi possível carregar as regras do VGC.'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, id]);

  // Checklist das regras, calculado no front pra dar retorno imediato. O back
  // valida tudo de novo ao salvar (VgcTeamValidator).
  const checks = useMemo(() => {
    if (!rules) return [];
    const numbers = members.map((m) => m.pokemon.pokedex_number);
    const itemIds = members.map((m) => m.item_id).filter((x): x is number => x !== null);
    const restricted = numbers.filter((n) => rules.restricted.includes(n)).length;

    return [
      {
        ok: members.length === rules.team_size,
        warning: members.length < rules.team_size,
        label: `${members.length}/${rules.team_size} pokémons`,
        hint:
          members.length < rules.team_size
            ? 'Dá pra salvar como rascunho, mas o time só fica completo com 6.'
            : `Na batalha você escolhe ${rules.battle_size} dos ${rules.team_size}.`,
      },
      {
        ok: new Set(numbers).size === numbers.length,
        label: 'Species Clause',
        hint: 'Sem pokémons repetidos (mesmo número na dex nacional).',
      },
      {
        ok: new Set(itemIds).size === itemIds.length,
        label: 'Item Clause',
        hint: 'Nenhum item repetido no time.',
      },
      {
        ok: restricted <= rules.max_restricted,
        label: `Restritos: ${restricted}/${rules.max_restricted}`,
        hint: 'Lendários de capa (Mewtwo, Kyogre, Calyrex...).',
      },
      {
        ok: members.every((m) => m.move_ids.some((x) => x !== null)),
        label: 'Golpes',
        hint: `Cada pokémon precisa de 1 a ${rules.max_moves} golpes.`,
      },
      {
        ok: members.every((m) => totalStatPoints(m.stat_points) <= rules.stat_points.total),
        label: 'Stat points',
        hint: `Até ${rules.stat_points.total} por pokémon, máx. ${rules.stat_points.per_stat} por stat.`,
      },
    ];
  }, [members, rules]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (loadError || !rules) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error">{loadError}</Alert>
      </Container>
    );
  }

  const current = members[selected];
  const restrictedInTeam = members.filter((m) => rules.restricted.includes(m.pokemon.pokedex_number)).length;

  async function addMember(pokemon: PokemonSummary) {
    if (!rules) return;
    // Já deixa a primeira habilidade escolhida. O learnset fica em cache,
    // então o editor não busca de novo.
    const learnset = await fetchLearnset(pokemon.id).catch(() => null);
    const draft: MemberDraft = {
      key: nextKey(),
      pokemon,
      ability_id: learnset?.abilities[0]?.id ?? null,
      item_id: null,
      nature: Object.keys(rules.natures)[0],
      stat_points: emptyStatPoints(),
      move_ids: padMoves([], rules.max_moves),
    };
    setMembers([...members, draft]);
    setSelected(members.length);
    setSaved(false);
  }

  function updateMember(index: number, member: MemberDraft) {
    setMembers((prev) => prev.map((m, i) => (i === index ? member : m)));
    setSaved(false);
  }

  function removeMember(index: number) {
    setMembers((prev) => prev.filter((_, i) => i !== index));
    setSelected((prev) => Math.max(0, prev >= index ? prev - 1 : prev));
    // Os erros do back são por posição; depois de remover, as posições mudam.
    setErrors({});
    setSaved(false);
  }

  function memberErrors(index: number): FieldErrors {
    const prefix = `members.${index}.`;
    return Object.fromEntries(
      Object.entries(errors)
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, messages]) => [key.slice(prefix.length), messages]),
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setErrors({});
    setSaved(false);

    const payload: TeamPayload = {
      name: name.trim(),
      members: members.map((m) => ({
        pokemon_id: m.pokemon.id,
        ability_id: m.ability_id,
        item_id: m.item_id,
        nature: m.nature,
        stat_points: m.stat_points,
        move_ids: m.move_ids.filter((x): x is number => x !== null),
      })),
    };

    try {
      if (id) {
        await updateTeam(Number(id), payload);
        setSaved(true);
      } else {
        const team = await createTeam(payload);
        navigate(`/teams/${team.id}`, { replace: true });
      }
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 422) {
        setErrors(err.response.data.errors ?? {});
        setSaveError('O time não segue as regras do VGC. Corrija os campos destacados.');
      } else {
        setSaveError('Não foi possível salvar o time. Tente novamente.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <MuiLink
        component={Link}
        to="/teams"
        underline="hover"
        variant="body2"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
      >
        <ArrowBackIcon fontSize="inherit" /> Voltar para meus times
      </MuiLink>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }} mt={2} mb={3}>
        <TextField
          label="Nome do time"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          error={!!errors.name}
          helperText={errors.name?.[0]}
          slotProps={{ htmlInput: { maxLength: 50 } }}
          sx={{ flex: 1 }}
        />
        <Button
          variant="contained"
          size="large"
          disableElevation
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{ height: 56 }}
        >
          Salvar time
        </Button>
      </Stack>

      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {saveError}
          {errors.members?.map((message) => (
            <Box key={message}>{message}</Box>
          ))}
        </Alert>
      )}
      {saved && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Time salvo!
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: '1fr 260px' },
          alignItems: 'start',
        }}
      >
        <Stack spacing={3} minWidth={0}>
          {/* Os 6 slots do time */}
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: `repeat(${rules.team_size}, 1fr)` },
            }}
          >
            {Array.from({ length: rules.team_size }, (_, index) => {
              const member = members[index];
              const hasErrors = Object.keys(memberErrors(index)).length > 0;
              const item = member && items.find((i) => i.id === member.item_id);

              if (!member) {
                return (
                  <Paper
                    key={`empty-${index}`}
                    variant="outlined"
                    sx={{
                      borderStyle: 'dashed',
                      aspectRatio: '1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'text.disabled',
                    }}
                  >
                    <AddIcon />
                  </Paper>
                );
              }

              return (
                <ButtonBase
                  key={member.key}
                  onClick={() => setSelected(index)}
                  sx={{
                    borderRadius: 1,
                    border: 2,
                    borderColor: hasErrors ? 'error.main' : index === selected ? 'primary.main' : 'divider',
                    bgcolor: index === selected ? 'action.selected' : 'grey.50',
                    aspectRatio: '1',
                    flexDirection: 'column',
                    position: 'relative',
                    p: 0.5,
                  }}
                >
                  {member.pokemon.sprite_url && (
                    <Box component="img" src={member.pokemon.sprite_url} alt="" sx={{ width: '70%', height: 'auto' }} />
                  )}
                  <Typography
                    variant="caption"
                    fontWeight={600}
                    textTransform="capitalize"
                    noWrap
                    sx={{ maxWidth: '100%' }}
                  >
                    {formatName(member.pokemon.name)}
                  </Typography>
                  {item?.sprite_url && (
                    <Box
                      component="img"
                      src={item.sprite_url}
                      alt={item.name}
                      title={formatName(item.name)}
                      sx={{ position: 'absolute', top: 2, right: 2, width: 24, height: 24 }}
                    />
                  )}
                </ButtonBase>
              );
            })}
          </Box>

          {members.length < rules.team_size && (
            <PokemonPicker
              rules={rules}
              takenPokedexNumbers={members.map((m) => m.pokemon.pokedex_number)}
              restrictedInTeam={restrictedInTeam}
              onSelect={addMember}
            />
          )}

          {current ? (
            <MemberEditor
              key={current.key}
              member={current}
              rules={rules}
              items={items}
              usedItemIds={members
                .filter((_, i) => i !== selected)
                .map((m) => m.item_id)
                .filter((x): x is number => x !== null)}
              errors={memberErrors(selected)}
              onChange={(member) => updateMember(selected, member)}
              onRemove={() => removeMember(selected)}
            />
          ) : (
            <Alert severity="info">Busque um pokémon acima para começar a montar o time.</Alert>
          )}
        </Stack>

        {/* Checklist de regras */}
        <Paper variant="outlined" sx={{ p: 2, position: { md: 'sticky' }, top: { md: 16 } }}>
          <Typography variant="overline" color="text.secondary">
            Regras
          </Typography>
          <Typography variant="body2" fontWeight={600}>
            {rules.regulation}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
            Duplas · Nível {rules.level} · {rules.team_size} registrados, {rules.battle_size} por batalha
          </Typography>
          <Stack spacing={1.25}>
            {checks.map((check) => (
              <Stack key={check.label} direction="row" spacing={1} alignItems="flex-start">
                {check.ok ? (
                  <CheckCircleIcon fontSize="small" color="success" />
                ) : check.warning ? (
                  <InfoIcon fontSize="small" color="warning" />
                ) : (
                  <ErrorIcon fontSize="small" color="error" />
                )}
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {check.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {check.hint}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
}
