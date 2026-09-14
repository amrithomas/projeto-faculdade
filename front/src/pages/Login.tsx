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
import { loginUser } from '../api/auth';
import { useAuthStore } from '../store/authStore';

export function Login() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user, token } = await loginUser(username, password);
      setSession(user, token);
      navigate('/');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        setError('Usuário ou senha inválidos.');
      } else {
        setError('Não foi possível entrar. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <Paper variant="outlined" sx={{ p: 4 }}>
        <Typography variant="h5" fontWeight={700} mb={3} textAlign="center">
          Entrar
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
          <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </Stack>

        <Typography variant="body2" textAlign="center" mt={3}>
          Não tem conta?{' '}
          <MuiLink component={Link} to="/register">
            Cadastre-se
          </MuiLink>
        </Typography>
      </Paper>
    </Container>
  );
}
