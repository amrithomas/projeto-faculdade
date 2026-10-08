import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import App from './App.tsx'
import './index.css'

// Tema MUI usado em toda a aplicação (cor da Pokébola como cor primária).
const theme = createTheme({
  palette: {
    primary: { main: '#DC2626' },
    secondary: { main: '#FACC15' },
    background: { default: '#F4F6FB' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Nunito", "Segoe UI", Roboto, sans-serif',
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundImage: 'radial-gradient(circle at 100% 0, #FEE2E2 0, transparent 40%)', backgroundAttachment: 'fixed' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { background: 'linear-gradient(90deg, #B91C1C, #DC2626 60%, #EF4444)', color: '#fff' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          transition: 'transform .15s, box-shadow .15s',
          '&:hover': { transform: 'translateY(-1px)' },
          '&:active': { transform: 'scale(.97)' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: { outlined: { borderColor: '#E5E7EB' } },
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
