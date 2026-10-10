import { useState } from 'react';
import Box from '@mui/material/Box';
import type { BattleState } from '../../types/battle';
import { spriteUrl } from '../../utils/battleLog';

interface Props {
  species: string;
  images: Pick<BattleState, 'sprites' | 'artwork'>;
  back?: boolean;
  height: number;
}

/**
 * Sprite do Showdown com reservas: se a de costas não existir, usa a de
 * frente; se nenhuma existir (megas do Legends Z-A), a imagem do nosso banco.
 */
export function PokemonSprite(props: Props) {
  // key: ao mega evoluir a espécie muda e as tentativas recomeçam.
  return <SpriteWithFallback key={`${props.species}-${props.back}`} {...props} />;
}

function SpriteWithFallback({ species, images, back = false, height }: Props) {
  const sources = [
    spriteUrl(species, images.sprites, back),
    back && spriteUrl(species, images.sprites),
    images.artwork[species],
  ].filter((src): src is string => !!src);
  const [attempt, setAttempt] = useState(0);

  if (attempt >= sources.length) return <Box sx={{ height }} />;

  const isArtwork = sources[attempt] === images.artwork[species];
  return (
    <Box
      component="img"
      src={sources[attempt]}
      alt={species}
      title={species}
      onError={() => setAttempt((n) => n + 1)}
      sx={{ height, imageRendering: isArtwork ? 'auto' : 'pixelated' }}
    />
  );
}
