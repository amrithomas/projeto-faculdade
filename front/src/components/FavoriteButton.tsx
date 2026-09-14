import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useAuthStore } from '../store/authStore';
import { toggleFavorite } from '../api/favorites';

interface Props {
  pokemonId: number;
  isFavorited: boolean;
  onToggled?: (isFavorited: boolean) => void;
  size?: 'small' | 'medium' | 'large';
  /** Fundo levemente escurecido, pra ficar legível sobre uma imagem/sprite. */
  overlay?: boolean;
}

export function FavoriteButton({ pokemonId, isFavorited, onToggled, size = 'medium', overlay = false }: Props) {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [favorited, setFavorited] = useState(isFavorited);
  const [pending, setPending] = useState(false);

  // Se o pai mandar um isFavorited novo (ex: carregou os dados do pokémon
  // depois do primeiro render), sincroniza.
  useEffect(() => {
    setFavorited(isFavorited);
  }, [isFavorited]);

  async function handleClick(event: MouseEvent) {
    // O botão costuma ficar dentro de um card clicável (Link) — não deixa
    // o clique "vazar" e navegar pra outra página.
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (pending) return;

    const previous = favorited;
    setFavorited(!previous);
    setPending(true);
    try {
      const result = await toggleFavorite(pokemonId);
      setFavorited(result);
      onToggled?.(result);
    } catch {
      setFavorited(previous);
    } finally {
      setPending(false);
    }
  }

  return (
    <Tooltip title={favorited ? 'Remover dos favoritos' : 'Favoritar'}>
      <IconButton
        onClick={handleClick}
        size={size}
        sx={
          overlay
            ? {
                bgcolor: 'rgba(255,255,255,0.85)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.95)' },
              }
            : undefined
        }
      >
        {favorited ? <FavoriteIcon color="error" fontSize={size} /> : <FavoriteBorderIcon fontSize={size} />}
      </IconButton>
    </Tooltip>
  );
}
