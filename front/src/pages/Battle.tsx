import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useAuthStore } from '../store/authStore';
import { fetchTeams } from '../api/teams';
import { type Difficulty, fetchBattle, sendChoice, startBattle } from '../api/battles';
import type { Team } from '../types/team';
import type { BattleState } from '../types/battle';
import { describe, readField } from '../utils/battleLog';
import { BattleField } from '../components/battle/BattleField';
import { ChoicePanel } from '../components/battle/ChoicePanel';

const DIFFICULTY_HINT: Record<Difficulty, string> = {
  easy: 'Jogadas aleatórias.',
  medium: 'Claude Haiku: joga de forma sensata e rápida.',
  hard: 'Claude Sonnet: joga como competidor, prevê suas jogadas.',
};

function errorMessage(err: unknown, fallback: string): string {
  return isAxiosError(err) ? (err.response?.data?.message ?? fallback) : fallback;
}

export function Battle() {
  const { id } = useParams<{ id: string }>();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return id ? <BattleView id={id} /> : <BattleSetup />;
}

function BattleSetup() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [teamId, setTeamId] = useState('');
  const [opponentId, setOpponentId] = useState('random');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeams()
      .then((all) => setTeams(all.filter((team) => team.is_complete)))
      .catch(() => setError('Não foi possível carregar seus times.'));
  }, []);

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const battle = await startBattle(Number(teamId), opponentId === 'random' ? 'random' : Number(opponentId), difficulty);
      navigate(`/battles/${battle.id}`);
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível iniciar a batalha.'));
      setStarting(false);
    }
  }

  const teamSelect = (label: string, value: string, onChange: (value: string) => void, opponent = false) => (
    <TextField
      select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      helperText={opponent && (value === 'random' ? 'Sorteia um dos times prontos da IA, montados para a dificuldade escolhida.' : 'A IA vai jogar com este time seu.')}
      sx={{ flex: 1 }}
    >
      {opponent && <MenuItem value="random">Aleatório (time da IA)</MenuItem>}
      {teams?.map((team) => (
        <MenuItem key={team.id} value={team.id}>
          {team.name}
        </MenuItem>
      ))}
    </TextField>
  );

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" fontWeight={700}>
        Nova batalha
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Duplas VGC no formato do Pokémon Champions contra a IA.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!teams ? (
        !error && <CircularProgress />
      ) : teams.length === 0 ? (
        <Alert severity="info">
          Você precisa de um time completo (6 pokémons) para batalhar. <Link to="/teams/new">Montar um time</Link>
        </Alert>
      ) : (
        <Stack spacing={2}>
          {teamSelect('Seu time', teamId, setTeamId)}
          {teamSelect('Time do oponente', opponentId, setOpponentId, true)}
          <TextField
            select
            label="Dificuldade da IA"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            helperText={DIFFICULTY_HINT[difficulty]}
          >
            <MenuItem value="easy">Fácil</MenuItem>
            <MenuItem value="medium">Médio</MenuItem>
            <MenuItem value="hard">Difícil</MenuItem>
          </TextField>
          <Button
            variant="contained"
            size="large"
            disableElevation
            disabled={!teamId || !opponentId || starting}
            onClick={start}
          >
            Começar batalha
          </Button>
        </Stack>
      )}
    </Container>
  );
}

function BattleView({ id }: { id: string }) {
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [choiceError, setChoiceError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const logEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchBattle(id)
      .then(setBattle)
      .catch((err) => setLoadError(errorMessage(err, 'Batalha não encontrada.')));
  }, [id]);

  const field = useMemo(() => readField(battle?.log ?? []), [battle]);
  const lines = useMemo(
    () => (battle?.log ?? []).map(describe).filter((line): line is string => line !== null),
    [battle],
  );

  useEffect(() => {
    logEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [lines.length]);

  async function choose(choice: string) {
    setBusy(true);
    setChoiceError(null);
    try {
      setBattle(await sendChoice(id, choice));
    } catch (err) {
      setChoiceError(errorMessage(err, 'Não foi possível enviar a jogada.'));
      // Uma jogada recusada pode revelar algo novo (ex: preso pela Shadow Tag
      // do oponente): recarrega o pedido pra tela refletir isso.
      fetchBattle(id).then(setBattle).catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error">
          {loadError} <Link to="/battles/new">Começar outra</Link>
        </Alert>
      </Container>
    );
  }

  if (!battle) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 320px' }, alignItems: 'start' }}>
        <Stack spacing={2} minWidth={0}>
          {!battle.request?.teamPreview && <BattleField field={field} images={battle} />}

          {choiceError && <Alert severity="error">{choiceError}</Alert>}

          {busy && (
            <Stack direction="row" spacing={1} alignItems="center" color="text.secondary" role="status">
              <CircularProgress size={16} color="inherit" />
              <Typography variant="body2">Oponente pensando…</Typography>
            </Stack>
          )}

          {battle.ended ? (
            <Alert
              severity={battle.winner === 'Você' ? 'success' : 'info'}
              action={
                <Button component={Link} to="/battles/new" color="inherit" size="small">
                  Nova batalha
                </Button>
              }
            >
              {battle.winner === 'Você' ? 'Você venceu!' : battle.winner ? 'O oponente venceu.' : 'Empate.'}
            </Alert>
          ) : (
            battle.request && (
              <ChoicePanel
                // Recria o painel a cada pedido novo, zerando as seleções.
                key={battle.log.length}
                request={battle.request}
                field={field}
                images={battle}
                busy={busy}
                onSubmit={choose}
              />
            )
          )}
        </Stack>

        <Paper variant="outlined" sx={{ p: 2, maxHeight: { md: 560 }, overflow: 'auto', position: { md: 'sticky' }, top: { md: 80 } }}>
          <Typography variant="overline" color="text.secondary">
            Registro da batalha
          </Typography>
          <Stack spacing={0.5} mt={0.5}>
            {lines.map((line, i) => (
              <Typography
                key={i}
                variant="body2"
                fontWeight={line.startsWith('—') ? 700 : 400}
                color={line.startsWith('—') ? 'text.primary' : 'text.secondary'}
                mt={line.startsWith('—') ? 1 : 0}
              >
                {line}
              </Typography>
            ))}
            <div ref={logEnd} />
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
}
