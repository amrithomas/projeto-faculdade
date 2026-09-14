import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import MuiLink from '@mui/material/Link';
import { registerUser } from '../api/auth';
import { useAuthStore } from '../store/authStore';

export function Register() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const { user, token } = await registerUser(username, password);
      setSession(user, token);
      navigate('/');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        const errors = err.response.data?.errors as Record<string, string[]> | undefined;
        const firstMessage = errors ? Object.values(errors)[0]?.[0] : undefined;
        setError(firstMessage ?? 'Não foi possível concluir o cadastro.');
      } else {
        setError('Não foi possível concluir o cadastro. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Paper variant="outlined" sx={{ p: 4 }}>
        <Typography variant="h5" fontWeight={700} mb={1} textAlign="center">
          Criar conta
        </Typography>

        <Stack component="form" onSubmit={handleSubmit} spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
            fullWidth
          />
          <TextField
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Confirmar senha"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            fullWidth
          />
          <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
            {loading ? 'Criando...' : 'Criar conta'}
          </Button>
        </Stack>

        <Typography variant="body2" textAlign="center" mt={3}>
          Já tem conta?{' '}
          <MuiLink component={Link} to="/login">
            Entrar
          </MuiLink>
        </Typography>
      </Paper>
    </Container>
  );
}
