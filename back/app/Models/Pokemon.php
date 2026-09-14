<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;

class Pokemon extends Model
{
    protected $table = 'pokemons';

    protected $fillable = [
        'pokedex_number',
        'generation',
        'region',
        'regional_dex_number',
        'evolves_from_pokedex_number',
        'name',
        'types',
        'sprite_url',
        'description',
        'genus',
        'gender_rate',
        'height',
        'weight',
        'stats',
    ];

    protected $casts = [
        'types' => 'array',
        'stats' => 'array',
        'height' => 'float',
        'weight' => 'float',
    ];

    public function abilities(): BelongsToMany
    {
        return $this->belongsToMany(Ability::class, 'ability_pokemon')
            ->withPivot(['is_hidden', 'slot'])
            ->orderByPivot('slot');
    }

    public function moves(): BelongsToMany
    {
        return $this->belongsToMany(Move::class, 'move_pokemon')
            ->withPivot(['level', 'learn_method'])
            ->orderByPivot('level');
    }

    public function favoritedBy(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'favorite_pokemon')->withTimestamps();
    }

    /**
     * O pokémon do qual este evolui diretamente (pré-evolução), se houver.
     */
    public function preEvolution(): BelongsTo
    {
        return $this->belongsTo(Pokemon::class, 'evolves_from_pokedex_number', 'pokedex_number');
    }

    /**
     * Os pokémons que evoluem diretamente a partir deste. Pode ser mais de
     * um (ex: Eevee tem várias evoluções possíveis).
     */
    public function evolutions(): HasMany
    {
        return $this->hasMany(Pokemon::class, 'evolves_from_pokedex_number', 'pokedex_number');
    }

    /**
     * A linha evolutiva inteira deste pokémon, do estágio base até as
     * evoluções finais, agrupada por estágio — não só o elo direto
     * anterior/seguinte a ele. É o que a tela de detalhes usa pra desenhar
     * a corrente completa (ex: Starly > Staravia > Staraptor), não importa
     * qual dos três estágios você está vendo.
     *
     * @return array<int, Collection<int, Pokemon>>
     */
    public function evolutionFamily(): array
    {
        $root = $this;

        while ($root->preEvolution) {
            $root = $root->preEvolution;
        }

        $stages = [];
        $current = collect([$root]);

        while ($current->isNotEmpty()) {
            $stages[] = $current->values();
            $current = $current->flatMap(fn (self $p) => $p->evolutions);
        }

        return $stages;
    }
}
