<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Usado na listagem (index). Deliberadamente enxuto — não inclui
 * habilidades/golpes/evolução, que exigiriam eager loading extra em
 * uma lista paginada. Isso fica em PokemonDetailResource.
 *
 * @mixin \App\Models\Pokemon
 */
class PokemonResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'pokedex_number' => $this->pokedex_number,
            'generation' => $this->generation,
            'region' => $this->region,
            'regional_dex_number' => $this->regional_dex_number,
            'name' => $this->name,
            'types' => $this->types,
            'sprite_url' => $this->sprite_url,
            'height' => $this->height,
            'weight' => $this->weight,
            'stats' => $this->stats,
            'is_legendary' => (bool) $this->is_legendary,
            'is_mythical' => (bool) $this->is_mythical,
            'is_restricted' => $this->isRestricted(),
            'is_favorited' => $this->relationLoaded('favoritedBy') && $this->favoritedBy->isNotEmpty(),
        ];
    }
}
