<?php

namespace App\Http\Resources;

use App\Services\TypeEffectivenessService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Usado em GET /api/pokemons/{pokemon}. Espera que o controller já tenha
 * feito eager load de abilities e moves.
 *
 * @mixin \App\Models\Pokemon
 */
class PokemonDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var TypeEffectivenessService $effectiveness */
        $effectiveness = app(TypeEffectivenessService::class);

        return [
            'id' => $this->id,
            'pokedex_number' => $this->pokedex_number,
            'generation' => $this->generation,
            'region' => $this->region,
            'regional_dex_number' => $this->regional_dex_number,
            'name' => $this->name,
            'types' => $this->types,
            'sprite_url' => $this->sprite_url,
            'description' => $this->description,
            'genus' => $this->genus,
            'gender' => $this->genderInfo(),
            'height' => $this->height,
            'weight' => $this->weight,
            'stats' => $this->stats,
            'is_favorited' => $this->relationLoaded('favoritedBy') && $this->favoritedBy->isNotEmpty(),
            'type_effectiveness' => $effectiveness->calculate($this->types),
            'abilities' => $this->abilities->map(fn ($ability) => [
                'name' => $ability->name,
                'description' => $ability->description,
                'is_hidden' => (bool) $ability->pivot->is_hidden,
            ])->values(),
            'moves' => $this->moves->map(fn ($move) => [
                'name' => $move->name,
                'level' => $move->pivot->level,
                'type' => $move->type,
                'damage_class' => $move->damage_class,
                'power' => $move->power,
                'accuracy' => $move->accuracy,
                'pp' => $move->pp,
                'description' => $move->description,
            ])->values(),
            // Linha evolutiva completa, agrupada por estágio (não só o elo
            // anterior/seguinte a este pokémon) — ver Pokemon::evolutionFamily().
            'evolution_family' => collect($this->evolutionFamily())
                ->map(fn ($stage) => $stage->map(fn ($p) => [
                    'id' => $p->id,
                    'pokedex_number' => $p->pokedex_number,
                    'name' => $p->name,
                    'sprite_url' => $p->sprite_url,
                    'types' => $p->types,
                ])->values())
                ->values(),
        ];
    }

    /**
     * Converte o gender_rate cru da PokeAPI (-1 a 8) em algo fácil de
     * exibir: se o pokémon pode ser macho e/ou fêmea. -1 = sem gênero.
     */
    private function genderInfo(): ?array
    {
        if ($this->gender_rate === null) {
            return null;
        }

        if ($this->gender_rate === -1) {
            return ['male' => false, 'female' => false];
        }

        return [
            'male' => $this->gender_rate < 8,
            'female' => $this->gender_rate > 0,
        ];
    }
}
