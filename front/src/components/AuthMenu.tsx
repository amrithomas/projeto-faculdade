import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import GroupsIcon from '@mui/icons-material/Groups';
import { useAuthStore } from '../store/authStore';
import { logoutUser } from '../api/auth';

/**
 * Ocupa o canto superior direito da barra de navegação: mostra "Entrar" /
 * "Cadastrar" pra visitantes, ou o nome do usuário com um menu (perfil/sair)
 * pra quem está logado.
 */
export function AuthMenu() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  if (!isAuthenticated || !user) {
    return (
      <Stack direction="row" spacing={1}>
        <Button component={Link} to="/login" color="inherit">
          Entrar
        </Button>
        <Button component={Link} to="/register" variant="contained" disableElevation>
          Cadastrar
        </Button>
      </Stack>
    );
  }

  async function handleLogout() {
    setAnchorEl(null);
    try {
      await logoutUser();
    } catch {
      // Mesmo que o back não responda (token já expirado, rede etc), a
      // sessão local é limpa de qualquer forma.
    } finally {
      clearSession();
      navigate('/');
    }
  }

  return (
    <>
      <Button
        onClick={(event) => setAnchorEl(event.currentTarget)}
        color="inherit"
        sx={{ textTransform: 'none', gap: 1 }}
      >
        <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: 14 }}>
          {user.username[0]?.toUpperCase()}
        </Avatar>
        {user.username}
      </Button>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem component={Link} to="/profile" onClick={() => setAnchorEl(null)}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          Meu perfil
        </MenuItem>
        <MenuItem component={Link} to="/teams" onClick={() => setAnchorEl(null)}>
          <ListItemIcon>
            <GroupsIcon fontSize="small" />
          </ListItemIcon>
          Meus times
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Sair
        </MenuItem>
      </Menu>
    </>
  );
}
