<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Ability extends Model
{
    protected $fillable = ['pokeapi_id', 'name', 'description'];

    public function pokemons(): BelongsToMany
    {
        return $this->belongsToMany(Pokemon::class, 'ability_pokemon')
            ->withPivot(['is_hidden', 'slot']);
    }
}
