import { Routes, Route, Link, useLocation } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Pokedex } from './pages/Pokedex';
import { PokemonDetail } from './pages/PokemonDetail';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Profile } from './pages/Profile';
import { Teams } from './pages/Teams';
import { TeamBuilder } from './pages/TeamBuilder';
import { AuthMenu } from './components/AuthMenu';

function App() {
  const { pathname } = useLocation();

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar position="sticky" elevation={2}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography
            component={Link}
            to="/"
            variant="h6"
            fontWeight={800}
            sx={{ color: 'inherit', textDecoration: 'none', letterSpacing: 0.5 }}
          >
            ⚪ Pokédex
          </Typography>

          <AuthMenu />
        </Toolbar>
      </AppBar>

      {/* key no pathname: refaz o fade-in a cada troca de página. */}
      <Box component="main" key={pathname} className="page">
        <Routes>
          <Route path="/" element={<Pokedex />} />
          <Route path="/pokemon/:id" element={<PokemonDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/teams/new" element={<TeamBuilder />} />
          <Route path="/teams/:id" element={<TeamBuilder />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default App;
