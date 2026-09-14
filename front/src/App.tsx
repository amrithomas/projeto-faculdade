import { Routes, Route, Link } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Pokedex } from './pages/Pokedex';
import { PokemonDetail } from './pages/PokemonDetail';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Profile } from './pages/Profile';
import { AuthMenu } from './components/AuthMenu';

function App() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="static"
        color="default"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography
            component={Link}
            to="/"
            variant="h6"
            fontWeight={700}
            sx={{ color: 'text.primary', textDecoration: 'none' }}
          >
            🔴 Pokédex
          </Typography>

          <AuthMenu />
        </Toolbar>
      </AppBar>

      <Routes>
        <Route path="/" element={<Pokedex />} />
        <Route path="/pokemon/:id" element={<PokemonDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Box>
  );
}

export default App;
