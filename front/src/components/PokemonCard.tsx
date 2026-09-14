import { Link } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import type { PokemonSummary } from '../types/pokemon';
import { TypeBadge } from './TypeBadge';
import { FavoriteButton } from './FavoriteButton';

export function PokemonCard({
  pokemon,
  showRegionalNumber = false,
  onFavoriteToggled,
}: {
  pokemon: PokemonSummary;
  showRegionalNumber?: boolean;
  onFavoriteToggled?: (isFavorited: boolean) => void;
}) {
  const number =
    showRegionalNumber && pokemon.regional_dex_number
      ? pokemon.regional_dex_number
      : pokemon.pokedex_number;

  return (
    <Card elevation={0} sx={{ height: '100%', bgcolor: 'grey.50', position: 'relative' }}>
      <Box sx={{ position: 'absolute', top: 4, right: 4, zIndex: 1 }}>
        <FavoriteButton
          pokemonId={pokemon.id}
          isFavorited={pokemon.is_favorited}
          onToggled={onFavoriteToggled}
          size="small"
        />
      </Box>
      <CardActionArea
        component={Link}
        to={`/pokemon/${pokemon.id}`}
        sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          fontFamily="monospace"
          alignSelf="flex-end"
          sx={{ pr: 4 }}
        >
          Nº {String(number).padStart(4, '0')}
        </Typography>
        {pokemon.sprite_url ? (
          <Box
            component="img"
            src={pokemon.sprite_url}
            alt={pokemon.name}
            loading="lazy"
            sx={{ width: 100, height: 100 }}
          />
        ) : (
          <Box sx={{ width: 100, height: 100, bgcolor: 'grey.200', borderRadius: 1 }} />
        )}
        <CardContent sx={{ textAlign: 'center', p: '8px !important' }}>
          <Typography variant="subtitle1" fontWeight={700} textTransform="capitalize">
            {pokemon.name}
          </Typography>
          {pokemon.region && (
            <Typography variant="caption" color="text.disabled" display="block">
              {pokemon.region}
            </Typography>
          )}
          <Stack direction="row" spacing={0.5} justifyContent="center" mt={1} flexWrap="wrap" useFlexGap>
            {pokemon.types.map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
