import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { BattleRequest, BattleState } from '../../types/battle';
import type { Field } from '../../utils/battleLog';
import { type Action, buildChoice, slotsToDecide, switchOptions, targetsFor } from '../../utils/battleChoice';
import { PokemonSprite } from './PokemonSprite';

// "Charizard, L50, F" → "Charizard"
const speciesOf = (details: string) => details.split(',')[0];

interface Props {
  request: BattleRequest;
  field: Field;
  images: Pick<BattleState, 'sprites' | 'artwork'>;
  busy: boolean;
  onSubmit: (choice: string) => void;
}

/**
 * Monta a escolha do turno. O componente é recriado a cada pedido novo (key
 * no pai), então o estado das seleções começa zerado em todo turno.
 */
export function ChoicePanel(props: Props) {
  if (props.request.wait) {
    return <Typography color="text.secondary">Aguardando o oponente...</Typography>;
  }
  return props.request.teamPreview ? <TeamPreview {...props} /> : <TurnChoice {...props} />;
}

function TeamPreview({ request, field, images, busy, onSubmit }: Props) {
  const size = request.maxChosenTeamSize ?? 4;
  const [order, setOrder] = useState<number[]>([]);

  const toggle = (slot: number) =>
    setOrder((prev) => (prev.includes(slot) ? prev.filter((s) => s !== slot) : prev.length < size ? [...prev, slot] : prev));

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="overline" color="text.secondary">
          Time do oponente
        </Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          {field.opponentPreview.map((species) => (
            <PokemonSprite key={species} species={species} images={images} height={64} />
          ))}
        </Stack>
      </Box>

      <Box>
        <Typography variant="overline" color="text.secondary">
          Escolha {size} na ordem em que vão entrar (os 2 primeiros começam em campo)
        </Typography>
        <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(6, 1fr)' } }}>
          {request.side.pokemon.map((pokemon, i) => {
            const position = order.indexOf(i + 1);
            const species = speciesOf(pokemon.details);
            return (
              <ButtonBase
                key={pokemon.ident}
                onClick={() => toggle(i + 1)}
                sx={{
                  flexDirection: 'column',
                  border: 2,
                  borderRadius: 2,
                  p: 1,
                  position: 'relative',
                  borderColor: position >= 0 ? 'primary.main' : 'divider',
                  bgcolor: position >= 0 ? 'action.selected' : 'background.paper',
                  transition: 'transform .15s',
                  '&:hover': { transform: 'translateY(-2px)' },
                }}
              >
                {position >= 0 && (
                  <Typography
                    variant="caption"
                    fontWeight={800}
                    sx={{ position: 'absolute', top: 4, left: 8, color: 'primary.main' }}
                  >
                    {position + 1}
                  </Typography>
                )}
                <PokemonSprite species={species} images={images} height={64} />
                <Typography variant="caption" fontWeight={600} noWrap sx={{ maxWidth: '100%' }}>
                  {species}
                </Typography>
              </ButtonBase>
            );
          })}
        </Box>
      </Box>

      <Button
        variant="contained"
        disableElevation
        disabled={busy || order.length !== size}
        onClick={() => onSubmit(`team ${order.join('')}`)}
        sx={{ alignSelf: 'flex-start' }}
      >
        Confirmar time
      </Button>
    </Stack>
  );
}

function TurnChoice({ request, field, busy, onSubmit }: Props) {
  const decide = slotsToDecide(request);
  const [actions, setActions] = useState<(Action | null)[]>(decide.map((d) => (d ? null : { kind: 'pass' })));

  const setAction = (slot: number, action: Action | null) =>
    setActions((prev) => prev.map((a, i) => (i === slot ? action : a)));

  // Golpe que precisa de alvo só fica completo depois de escolher o alvo.
  const complete = actions.every((action, slot) => {
    if (!action || action.kind !== 'move') return !!action;
    const move = request.active?.[slot]?.moves[action.move - 1];
    return action.target !== undefined || targetsFor(move?.target ?? '', slot).length === 0;
  });

  // Uma mega por batalha: marcar num pokémon desmarca no outro.
  const megaTaken = actions.some((a) => a?.kind === 'move' && a.mega);

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {decide.map((needsDecision, slot) =>
          needsDecision ? (
            <SlotChoice
              key={slot}
              slot={slot}
              request={request}
              field={field}
              action={actions[slot]}
              takenSwitch={actions.flatMap((a, i) => (i !== slot && a?.kind === 'switch' ? [a.slot] : []))}
              megaTaken={megaTaken}
              onChange={(action) => setAction(slot, action)}
            />
          ) : null,
        )}
      </Box>
      <Button
        variant="contained"
        disableElevation
        disabled={busy || !complete}
        onClick={() => onSubmit(buildChoice(actions as Action[]))}
        sx={{ alignSelf: 'flex-start' }}
      >
        Confirmar jogada
      </Button>
    </Stack>
  );
}

function SlotChoice({
  slot,
  request,
  field,
  action,
  takenSwitch,
  megaTaken,
  onChange,
}: {
  slot: number;
  request: BattleRequest;
  field: Field;
  action: Action | null;
  takenSwitch: number[];
  megaTaken: boolean;
  onChange: (action: Action | null) => void;
}) {
  const pokemon = request.side.pokemon[slot];
  const active = request.forceSwitch ? undefined : request.active?.[slot];
  const selectedMove = action?.kind === 'move' ? active?.moves[action.move - 1] : undefined;
  const targets = selectedMove ? targetsFor(selectedMove.target, slot) : [];

  const targetLabel = (side: string, targetSlot: number) => {
    const position = `${side === 'foe' ? 'p2' : 'p1'}${targetSlot === 0 ? 'a' : 'b'}` as const;
    const species = field.active[position]?.species ?? '—';
    return side === 'self' ? `${species} (ele mesmo)` : side === 'ally' ? `${species} (aliado)` : species;
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography fontWeight={700} mb={1}>
        {speciesOf(pokemon.details)}
        {request.forceSwitch && ' precisa ser substituído'}
      </Typography>

      {active && (
        <>
          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: '1fr 1fr' }}>
            {active.moves.map((move, i) => (
              <Button
                key={move.id}
                size="small"
                variant={action?.kind === 'move' && action.move === i + 1 ? 'contained' : 'outlined'}
                disableElevation
                disabled={!!move.disabled || move.pp === 0}
                onClick={() => onChange({ kind: 'move', move: i + 1, mega: action?.kind === 'move' && action.mega })}
                sx={{ justifyContent: 'space-between' }}
              >
                <span>{move.move}</span>
                <Typography component="span" variant="caption" fontFamily="monospace">
                  {move.pp}/{move.maxpp}
                </Typography>
              </Button>
            ))}
          </Box>

          {targets.length > 0 && (
            <Box mt={1.5}>
              <Typography variant="caption" color="text.secondary">
                Alvo
              </Typography>
              <Stack direction="row" gap={1} flexWrap="wrap" mt={0.5}>
                {targets.map((target) => (
                  <Button
                    key={target.value}
                    size="small"
                    color={target.side === 'foe' ? 'error' : 'secondary'}
                    variant={action?.kind === 'move' && action.target === target.value ? 'contained' : 'outlined'}
                    disableElevation
                    onClick={() => action?.kind === 'move' && onChange({ ...action, target: target.value })}
                  >
                    {targetLabel(target.side, target.slot)}
                  </Button>
                ))}
              </Stack>
            </Box>
          )}

          {active.canMegaEvo && (
            <FormControlLabel
              sx={{ mt: 1 }}
              control={
                <Checkbox
                  size="small"
                  checked={action?.kind === 'move' && !!action.mega}
                  disabled={action?.kind !== 'move' || (megaTaken && !action.mega)}
                  onChange={(e) => action?.kind === 'move' && onChange({ ...action, mega: e.target.checked })}
                />
              }
              label="Mega evoluir"
            />
          )}
        </>
      )}

      {!active?.trapped && (
        <Box mt={1.5}>
          <Typography variant="caption" color="text.secondary">
            Trocar por
          </Typography>
          <Stack direction="row" gap={1} flexWrap="wrap" mt={0.5}>
            {switchOptions(request).map((teamSlot) => (
              <Button
                key={teamSlot}
                size="small"
                color="inherit"
                variant={action?.kind === 'switch' && action.slot === teamSlot ? 'contained' : 'outlined'}
                disableElevation
                disabled={takenSwitch.includes(teamSlot)}
                onClick={() => onChange({ kind: 'switch', slot: teamSlot })}
              >
                {speciesOf(request.side.pokemon[teamSlot - 1].details)}
              </Button>
            ))}
          </Stack>
        </Box>
      )}
    </Paper>
  );
}
